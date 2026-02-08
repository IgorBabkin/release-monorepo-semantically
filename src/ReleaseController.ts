import { z } from 'zod';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { action, controller } from './utils/controller';
import { VcsService } from './services/VcsService';
import {FileSystemService, FileSystemServiceKey} from './services/FileSystemService';
import { RenderService } from './services/RenderService';
import { ConventionalCommit } from './models/ConventionalCommit';
import { NpmPackage } from './models/NpmPackage';
import { PackageRelease } from './models/PackageRelease';
import { SemVerBumpType } from './models/SemVerBumpType';
import { PackageJSON } from './models/PackageJSON';
import {arg, option} from "./services/ArgsProvider";
import {inject} from "ts-ioc-container";

function getTemplatesDir(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return join(currentDir, '..', 'templates');
}

/**
 * @example Usage monorepo-semantic-release {controller-alias} {method-alias} ...args ...--options/-options
 */
@controller({ alias: 'release' })
export class ReleaseController {
  constructor(
    @inject(FileSystemServiceKey) private fileSystemService: FileSystemService,
    private readonly vscService: VcsService,
    private readonly renderService: RenderService,
  ) {}

  @action({ default: true })
  async run(@arg(z.string()) path: string, @option('dry-run', z.boolean()) dryRun: boolean): Promise<void> {
    // Phase 1: Discovery
    const packages = this.discoverPackages(path);
    const graph = this.buildDependencyGraph(packages);
    const sorted = this.topologicalSort(packages, graph);

    // Phase 2-3: Process packages sequentially
    const releasedVersions = new Map<string, string>();
    const releases: PackageRelease[] = [];

    for (const pkg of sorted) {
      const release = this.processPackage(pkg, releasedVersions);
      if (release) {
        releases.push(release);
        releasedVersions.set(release.pkg.name, release.newVersion);
      }
    }

    if (releases.length === 0) {
      console.log('No packages to release.');
      return;
    }

    // Phase 4: Release each package
    if (!dryRun) {
      for (const release of releases) {
        this.releasePackage(release);
      }
    }

    // Phase 5: Finalize
    if (!dryRun) {
      this.updateLockfile(path);
      this.createReleaseCommit(releases);
    }

    this.printSummary(releases, dryRun);
  }

  @action()
  async help(): Promise<void> {}

  // --- Phase 1: Discovery ---

  private discoverPackages(rootPath: string): NpmPackage[] {
    const packagePaths = this.fileSystemService.findPackages(rootPath);

    return packagePaths
      .map((pkgPath) => {
        const pkgJson = this.fileSystemService.readJson(join(pkgPath, 'package.json')) as PackageJSON;
        return NpmPackage.createFromPackage(pkgJson, pkgPath);
      })
      .filter((pkg) => !pkg.isPrivate);
  }

  private buildDependencyGraph(packages: NpmPackage[]): Map<string, string[]> {
    const packageNames = new Set(packages.map((p) => p.name));
    const graph = new Map<string, string[]>();

    for (const pkg of packages) {
      graph.set(pkg.name, pkg.getInternalDependencies(packageNames));
    }

    return graph;
  }

  private topologicalSort(packages: NpmPackage[], graph: Map<string, string[]>): NpmPackage[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);
      for (const dep of graph.get(name) ?? []) {
        visit(dep);
      }
      result.push(name);
    };

    for (const pkg of packages) {
      visit(pkg.name);
    }

    const packageMap = new Map(packages.map((p) => [p.name, p]));
    return result.map((name) => packageMap.get(name)!);
  }

  // --- Phase 2-3: Process Package ---

  private processPackage(pkg: NpmPackage, releasedVersions: Map<string, string>): PackageRelease | null {
    const lastTag = this.vscService.getLatestTag(pkg.name);
    const rawCommits = this.vscService.getCommits(lastTag ?? undefined);

    const allCommits = rawCommits.map((raw) => {
      const [hash, ...messageParts] = raw.split(' ');
      return ConventionalCommit.parse(messageParts.join(' '), hash);
    });

    const releaseCommits = allCommits.filter((c) => c.matchesScope(pkg.name)).filter((c) => c.isReleaseTrigger());

    const dependencyUpdates = pkg.getOutdatedDependencies(releasedVersions);
    const release = new PackageRelease(pkg, releaseCommits, dependencyUpdates);

    if (release.bumpType === SemVerBumpType.NONE) {
      return null;
    }

    return release;
  }

  // --- Phase 4: Release Package ---

  private releasePackage(release: PackageRelease): void {
    this.updatePackageDependencies(release);

    execSync(`npm version ${release.newVersion} --no-git-tag-version`, {
      cwd: release.pkg.path,
      stdio: 'pipe',
    });

    this.generateChangelog(release);
    this.vscService.createTag(release.tag);
  }

  private updatePackageDependencies(release: PackageRelease): void {
    if (release.dependencyUpdates.length === 0) return;

    const pkgJsonPath = join(release.pkg.path, 'package.json');
    const pkgJson = this.fileSystemService.readJson(pkgJsonPath) as PackageJSON;

    for (const update of release.dependencyUpdates) {
      if (pkgJson.dependencies?.[update.packageName]) {
        pkgJson.dependencies[update.packageName] = update.newVersion;
      }
    }

    this.fileSystemService.writeJson(pkgJsonPath, pkgJson);
  }

  private generateChangelog(release: PackageRelease): void {
    const entry = release.toChangelogEntry();
    const templatePath = join(getTemplatesDir(), 'changelog.hbs');
    const newContent = this.renderService.render(templatePath, { entry, packageName: release.pkg.name });

    const changelogPath = join(release.pkg.path, 'CHANGELOG.md');
    const existing = this.fileSystemService.fileExists(changelogPath)
      ? this.fileSystemService.readFile(changelogPath)
      : '';

    this.fileSystemService.writeFile(changelogPath, newContent + existing);
  }

  // --- Phase 5: Finalize ---

  private updateLockfile(rootPath: string): void {
    execSync('pnpm install --lockfile-only', { cwd: rootPath, stdio: 'pipe' });
  }

  private createReleaseCommit(releases: PackageRelease[]): void {
    const templatePath = join(getTemplatesDir(), 'release-commit-message.hbs');
    const message = this.renderService.render(templatePath, { releases });

    this.vscService.commit(message);
  }

  private printSummary(releases: PackageRelease[], dryRun: boolean): void {
    const prefix = dryRun ? '[DRY-RUN] ' : '';
    console.log(`\n${prefix}Released packages:`);
    for (const release of releases) {
      const reason =
        release.dependencyUpdates.length > 0 && release.commits.length === 0
          ? 'dependency update'
          : `${release.commits.length} commits`;
      console.log(`  - ${release.pkg.name}@${release.newVersion} (${reason})`);
    }
  }
}

import { NpmPackage } from './models/NpmPackage';
import { bumpTypeToString, bumpVersion, SemVerBumpType } from './models/SemVerBumpType';
import { PackageJSON } from './models/PackageJSON';
import { ReleaseCommit } from './services/ReleaseCommit';
import { ChangelogRenderer } from './services/ChangelogRenderer';
import { sortLessDependenciesFirst } from './sortLessDependenciesFirst';
import { PackageManager } from './services/PackageManager';
import path from 'node:path';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';
import { ConsoleLogger } from './services/ConsoleLogger';
import { ConventionalCommit } from './models/ConventionalCommit';

interface DependencyVersionChange {
  packageName: string;
  oldVersion: string;
  newVersion: string;
}

export class MonorepoController {
  private packages: NpmPackage[] = [];
  private rootPackageJson!: PackageJSON;

  constructor(
    private fileSystemService: NodeFileSystemService,
    private vscService: GitService,
    private changelog: ChangelogRenderer,
    private releaseCommit: ReleaseCommit,
    private packageManager: PackageManager,
    private logger: ConsoleLogger,
  ) {}

  discoverRootPackageJSON(): void {
    this.rootPackageJson = this.fileSystemService.readJson(path.resolve(process.cwd(), 'package.json')) as PackageJSON;
  }

  discoverPackages(): void {
    this.packages = this.fileSystemService.findManyByGlob(this.rootPackageJson.workspaces ?? [], process.cwd()).map((path) => {
      const pkg = this.fileSystemService.readJson(path) as PackageJSON;
      return NpmPackage.createFromPackage(pkg, path);
    });
  }

  private getInternalPackageNames(): Set<string> {
    return new Set(this.packages.map((pkg) => pkg.name));
  }

  private getPackageDir(pkg: NpmPackage): string {
    return path.dirname(pkg.path);
  }

  private getDependencyUpdates(packageName: NpmPackage, releasedVersions: Map<string, string>): DependencyVersionChange[] {
    const packageJson = this.fileSystemService.readJson(path.resolve(this.getPackageDir(packageName), 'package.json')) as {
      dependencies?: Record<string, string>;
    };
    const packageDependencies = packageName.filterDependencies(this.getInternalPackageNames());
    const changes: DependencyVersionChange[] = [];

    for (const depName of packageDependencies) {
      const depVersion = releasedVersions.get(depName);
      if (!depVersion) {
        continue;
      }

      const currentVersion = packageJson.dependencies?.[depName];
      if (currentVersion && currentVersion !== depVersion) {
        changes.push({
          packageName: depName,
          oldVersion: currentVersion,
          newVersion: depVersion,
        });
      }
    }

    return changes;
  }

  private applyDependencyUpdates(packageName: NpmPackage, changes: DependencyVersionChange[]): void {
    if (changes.length === 0) {
      return;
    }

    const packageJson = this.fileSystemService.readJson(path.resolve(this.getPackageDir(packageName), 'package.json')) as {
      dependencies?: Record<string, string>;
      [key: string]: unknown;
    };

    packageJson.dependencies ??= {};

    for (const change of changes) {
      packageJson.dependencies[change.packageName] = change.newVersion;
    }

    this.fileSystemService.writeJson(path.resolve(this.getPackageDir(packageName), 'package.json'), packageJson);
  }

  private isNonEmptyChangeSet(changes: DependencyVersionChange[]): boolean {
    return changes.some((change) => change.oldVersion !== change.newVersion);
  }

  private parseVersionBump(commits: ConventionalCommit[], versionBumpFromDependency: SemVerBumpType): SemVerBumpType {
    return Math.max(SemVerBumpType.NONE, ...commits.map((commit) => (commit.isBreaking ? SemVerBumpType.MAJOR : commit.bumpType)), versionBumpFromDependency);
  }

  private collectReleaseCommits(commits: ConventionalCommit[], packageName: string): ConventionalCommit[] {
    return commits.filter((commit) => commit.isReleaseTrigger() && commit.matchesScope(packageName));
  }

  release(): void {
    const sorted = sortLessDependenciesFirst(this.packages.filter((p) => !p.isPrivate));
    const versionBumpMap = new Map<string, SemVerBumpType>();
    const releasedVersions = new Map<string, string>(this.packages.map((pkg) => [pkg.name, pkg.version]));

    for (const pkg of sorted) {
      const currentVersion = releasedVersions.get(pkg.name) ?? pkg.version;
      const commits = this.vscService.findManyCommitsSinceTag(`${pkg.name}@${currentVersion}`);
      const dependencyUpdates = this.getDependencyUpdates(pkg, releasedVersions);
      const versionBumpFromDependencies = this.isNonEmptyChangeSet(dependencyUpdates) ? SemVerBumpType.MINOR : SemVerBumpType.NONE;
      const versionBump = this.parseVersionBump(
        commits.filter((commit) => commit.matchesScope(pkg.name)),
        versionBumpFromDependencies,
      );

      versionBumpMap.set(pkg.name, versionBump);
      if (versionBump === SemVerBumpType.NONE) {
        this.logger.info(`bump(${pkg.name}) ${currentVersion} (skipped)`);
      } else {
        this.applyDependencyUpdates(pkg, dependencyUpdates);
        this.packageManager.bumpVersion(pkg, versionBump);
        const newVersion = bumpVersion(currentVersion, versionBump);
        releasedVersions.set(pkg.name, newVersion);

        this.logger.info(`bump(${pkg.name}) ${currentVersion} (${bumpTypeToString(versionBump)})`);
      }

      const releaseCommits = this.collectReleaseCommits(commits, pkg.name);
      for (const commit of releaseCommits) {
        this.changelog.addLog(commit);
      }

      this.changelog.render({
        packageName: pkg.name,
        packageVersion: releasedVersions.get(pkg.name)!,
        previousVersion: currentVersion,
        packagePath: this.getPackageDir(pkg),
        dependencyUpdates,
      });
      this.logger.info(`changelog(${pkg.name}) generated`);
    }

    // create release commit
    this.releaseCommit.commit({});
    this.logger.info(`releaseCommit generated`);

    // create git tags for every released package
    for (const [packageName, versionBump] of versionBumpMap) {
      if (versionBump === SemVerBumpType.NONE) {
        continue;
      }

      const pkg = this.packages.find((p) => p.name === packageName)!;
      this.vscService.createTag(`${pkg.name}@${releasedVersions.get(packageName)}`);
      this.logger.info(`createTag ${pkg.name}@${releasedVersions.get(packageName)}`);
    }

    this.vscService.push(true);
    this.logger.info('VSC pushed');
  }
}

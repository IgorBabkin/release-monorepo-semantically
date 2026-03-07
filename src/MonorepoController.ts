import { NpmPackage } from './models/NpmPackage';
import { bumpTypeToString, bumpVersion, SemVerBumpType } from './models/SemVerBumpType';
import { PackageJSON } from './models/PackageJSON';
import { ReleaseCommitView } from './services/ReleaseCommitView';
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

interface ReleaseOptions {
  dryRun?: boolean;
}

interface ReleaseCommitChange {
  type: string;
  subject: string;
  isBreaking: boolean;
}

interface ReleaseCommitDependencyUpdate {
  packageName: string;
  oldVersion: string;
  newVersion: string;
}

interface ReleaseCommitPackage {
  name: string;
  version: string;
  previousVersion: string;
  commits: ReleaseCommitChange[];
  dependencyUpdates: ReleaseCommitDependencyUpdate[];
}

interface ReleasedPackageVersion {
  pkg: NpmPackage;
  version: string;
}

export class MonorepoController {
  private packages: NpmPackage[] = [];
  private rootPackageJson!: PackageJSON;

  constructor(
    private fileSystemService: NodeFileSystemService,
    private vcsService: GitService,
    private changelog: ChangelogRenderer,
    private releaseCommitView: ReleaseCommitView,
    private packageManager: PackageManager,
    private logger: ConsoleLogger,
  ) {}

  discoverRootPackageJSON(): void {
    this.rootPackageJson = this.fileSystemService.readJson(path.resolve(process.cwd(), 'package.json')) as PackageJSON;
  }

  discoverPackages(): void {
    const workspaceEntries = this.fileSystemService.findManyByGlob(this.rootPackageJson.workspaces ?? [], process.cwd());
    const packageJsonPaths = Array.from(
      new Set(
        workspaceEntries.map((entryPath) => this.resolveWorkspacePackageJsonPath(entryPath)).filter((entryPath): entryPath is string => Boolean(entryPath)),
      ),
    );

    this.packages = packageJsonPaths.map((packageJsonPath) => {
      const pkg = this.fileSystemService.readJson(packageJsonPath) as PackageJSON;
      return NpmPackage.createFromPackage(pkg, packageJsonPath);
    });
  }

  private resolveWorkspacePackageJsonPath(entryPath: string): string | undefined {
    const packageJsonPath = path.basename(entryPath) === 'package.json' ? entryPath : path.resolve(entryPath, 'package.json');
    return this.fileSystemService.fileExists(packageJsonPath) ? packageJsonPath : undefined;
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

  private collectReleaseCommits(commits: ConventionalCommit[]): ConventionalCommit[] {
    return commits.filter((commit) => commit.isReleaseTrigger());
  }

  private logStep(step: 'SKIP' | 'BUMP' | 'WRITE' | 'COMMIT' | 'TAG', detail: string): void {
    this.logger.info(`${step.padEnd(8)} ${detail}`);
  }

  private renderChangelog(
    pkg: NpmPackage,
    currentVersion: string,
    packageVersion: string,
    dependencyUpdates: DependencyVersionChange[],
    releaseCommits: ConventionalCommit[],
  ): void {
    for (const commit of releaseCommits) {
      this.changelog.addLog(commit);
    }

    this.changelog.render({
      packageName: pkg.name,
      packageVersion,
      previousVersion: currentVersion,
      packagePath: this.getPackageDir(pkg),
      dependencyUpdates,
    });
    this.logStep('WRITE', `${pkg.name} CHANGELOG.md`);
  }

  private createTags(releasedPackages: ReleasedPackageVersion[]): void {
    for (const releasedPackage of releasedPackages) {
      this.vcsService.createTag(`${releasedPackage.pkg.name}@${releasedPackage.version}`);
      this.logStep('TAG', `${releasedPackage.pkg.name}@${releasedPackage.version}`);
    }
  }

  private toReleaseCommitPackage(
    pkg: NpmPackage,
    previousVersion: string,
    version: string,
    commits: ConventionalCommit[],
    dependencyUpdates: DependencyVersionChange[],
  ): ReleaseCommitPackage {
    return {
      name: pkg.name,
      version,
      previousVersion,
      commits: commits.map((commit) => ({
        type: commit.type,
        subject: commit.subject,
        isBreaking: commit.isBreaking,
      })),
      dependencyUpdates: dependencyUpdates.map((dependencyUpdate) => ({
        packageName: dependencyUpdate.packageName,
        oldVersion: dependencyUpdate.oldVersion,
        newVersion: dependencyUpdate.newVersion,
      })),
    };
  }

  release(options: ReleaseOptions = {}): void {
    const { dryRun = false } = options;
    const sorted = sortLessDependenciesFirst(this.packages.filter((p) => !p.isPrivate));
    const releasedVersions = new Map<string, string>(this.packages.map((pkg) => [pkg.name, pkg.version]));
    const releasedPackages: ReleasedPackageVersion[] = [];
    const releaseCommitPackages: ReleaseCommitPackage[] = [];

    for (const pkg of sorted) {
      const currentVersion = releasedVersions.get(pkg.name) ?? pkg.version;
      const commits = this.vcsService.findManyCommitsSinceTag(`${pkg.name}@${currentVersion}`);
      const scopedCommits = commits.filter((commit) => commit.matchesScope(pkg.name));
      const dependencyUpdates = this.getDependencyUpdates(pkg, releasedVersions);
      const versionBumpFromDependencies = this.isNonEmptyChangeSet(dependencyUpdates) ? SemVerBumpType.MINOR : SemVerBumpType.NONE;
      const versionBump = this.parseVersionBump(scopedCommits, versionBumpFromDependencies);

      if (versionBump === SemVerBumpType.NONE) {
        this.logStep('SKIP', `${pkg.name}@${currentVersion}`);
        continue;
      }

      const newVersion = bumpVersion(currentVersion, versionBump);
      const releaseCommits = this.collectReleaseCommits(scopedCommits);
      this.applyDependencyUpdates(pkg, dependencyUpdates);
      this.packageManager.bumpVersion(pkg, versionBump);
      releasedVersions.set(pkg.name, newVersion);
      releasedPackages.push({ pkg, version: newVersion });
      releaseCommitPackages.push(this.toReleaseCommitPackage(pkg, currentVersion, newVersion, releaseCommits, dependencyUpdates));

      this.logStep('BUMP', `${pkg.name} ${currentVersion} -> ${newVersion} (${bumpTypeToString(versionBump)})`);
      this.renderChangelog(pkg, currentVersion, newVersion, dependencyUpdates, releaseCommits);
    }

    if (dryRun) {
      return;
    }

    // create release commit
    const commitMessage = this.releaseCommitView.render({ packages: releaseCommitPackages });
    this.vcsService.commit(commitMessage);
    this.logStep('COMMIT', commitMessage.split('\n', 1)[0]);

    // create git tags for every released package
    this.createTags(releasedPackages);
  }
}

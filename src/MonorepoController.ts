import { NpmPackage } from './models/NpmPackage';
import { aggregateBumpTypes, bumpTypeToString, SemVerBumpType } from './models/SemVerBumpType';
import { sortLessDependenciesFirst } from './sortLessDependenciesFirst';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';
import { ConsoleLogger } from './services/ConsoleLogger';
import { CliOptions } from './CliOptions';
import { ReleasePlugin } from './plugins/ReleasePlugin';
import { ConventionalCommit } from './models/ConventionalCommit';

type ReleaseOptions = Partial<Pick<CliOptions, 'dryRun' | 'noPush' | 'noPublish'>>;

export class MonorepoController {
  private packageSortedList: NpmPackage[] = [];

  constructor(
    private readonly plugins: ReleasePlugin[],
    private fs: NodeFileSystemService,
    private vsc: GitService,
    private logger: ConsoleLogger,
  ) {}

  discoverPackages(monorepoPath: string): void {
    const { workspaces = [] } = this.fs.readPackageJsonOrFail(monorepoPath);
    const packageJsonList = this.fs.findManyPackageJsonByGlob(workspaces, monorepoPath);
    this.packageSortedList = sortLessDependenciesFirst(
      packageJsonList.map(([pkgPath, pkg]) => NpmPackage.createFromPackage(pkg, pkgPath)).filter((p) => !p.isPrivate),
    );
  }

  release(options: ReleaseOptions = {}): void {
    const { dryRun = false, noPush = false, noPublish = false } = options;
    const releasedVersions = new Map<string, string>();
    const releasedCommits = new Map<string, ConventionalCommit[]>();

    for (const pkg of this.packageSortedList) {
      const pkgReleaseCommits = this.vsc.findManyCommitsSinceTag(pkg.getCommitTag()).filter((c) => c.matchesScope(pkg.name) && c.isReleaseTrigger());
      const dependencyUpdates = pkg.getDependencyUpdates(releasedVersions);
      const versionBump = aggregateBumpTypes(
        ...pkgReleaseCommits.map((c) => c.bumpType),
        dependencyUpdates.length ? SemVerBumpType.MINOR : SemVerBumpType.NONE,
      );

      if (versionBump === SemVerBumpType.NONE) {
        this.logStep('SKIP', `${pkg.name}@${pkg.version}`);
        continue;
      }

      const newVersion = pkg.getNewVersion(versionBump);
      releasedVersions.set(pkg.name, newVersion);
      releasedCommits.set(pkg.name, pkgReleaseCommits);
      this.logStep('BUMP', `${pkg.name} ${pkg.version} -> ${newVersion} (${bumpTypeToString(versionBump)})`);

      for (const plugin of this.plugins) {
        plugin.onPackageReleased?.({
          dryRun,
          noPush,
          noPublish,
          pkg: pkg,
          releasedVersions,
          releasedCommits: pkgReleaseCommits,
          releasedPackages: this.packageSortedList.filter((pkg) => releasedVersions.has(pkg.name)),
        });
      }
    }

    for (const plugin of this.plugins) {
      plugin.onReleaseComplete?.({
        dryRun,
        noPush,
        noPublish,
        releasedVersions,
        releasedPackages: this.packageSortedList.filter((pkg) => releasedVersions.has(pkg.name)),
        releasedCommits,
      });
    }
  }

  private logStep(step: 'SKIP' | 'BUMP', detail: string): void {
    this.logger.info(`${step.padEnd(8)} ${detail}`);
  }
}

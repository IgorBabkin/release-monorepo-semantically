import { NpmPackage } from './models/NpmPackage';
import { bumpVersion, SemVerBumpType } from './models/SemVerBumpType';
import { PackageJSON } from './models/PackageJSON';
import { ReleaseCommit } from './services/ReleaseCommit';
import { ChangelogRenderer } from './services/ChangelogRenderer';
import { sortLessDependenciesFirst } from './sortLessDependenciesFirst';
import { PackageManager } from './services/PackageManager';
import path from 'node:path';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';

export class MonorepoController {
  private packages: NpmPackage[] = [];
  private rootPackageJson!: PackageJSON;

  constructor(
    private fileSystemService: NodeFileSystemService,
    private vscService: GitService,
    private changelog: ChangelogRenderer,
    private releaseCommit: ReleaseCommit,
    private packageManager: PackageManager,
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

  release(): void {
    const sorted = sortLessDependenciesFirst(this.packages.filter((p) => !p.isPrivate));
    const versionBumpMap = new Map<string, SemVerBumpType>();

    for (const pkg of sorted) {
      const commits = this.vscService.findManyCommitsSinceTag(`${pkg.name}@${pkg.version}`);

      // calculate version bump
      const versionBump = Math.max(
        SemVerBumpType.NONE,
        ...commits.map((commit) => (commit.isBreaking ? SemVerBumpType.MAJOR : commit.bumpType)),
        ...Object.entries(versionBumpMap).map(([k, v]) => {
          return !!v && pkg.hasDependency(k) ? SemVerBumpType.MINOR : SemVerBumpType.NONE;
        }),
      );

      versionBumpMap.set(pkg.name, versionBump);
      if (versionBump !== SemVerBumpType.NONE) {
        this.packageManager.bumpVersion(pkg, versionBump);
      }

      // collect changelog logs and render after bump to capture new version
      for (const commit of commits.filter((c): boolean => c.isReleaseTrigger())) {
        this.changelog.addLog(commit);
      }

      this.changelog.render({
        packageName: pkg.name,
        packageVersion: pkg.version,
        packagePath: pkg.path,
      });
    }

    // create release commit
    this.releaseCommit.commit({});

    // create git tags for every released package
    for (const [packageName, versionBump] of versionBumpMap) {
      const pkg = this.packages.find((p) => p.name === packageName)!;
      if (versionBump !== SemVerBumpType.NONE) {
        const newVersion = bumpVersion(pkg.version, versionBump);
        this.vscService.createTag(`${pkg.name}@${newVersion}`);
      }
    }

    this.vscService.push(true);
  }
}

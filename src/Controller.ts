import 'reflect-metadata';

import { NpmPackage } from './models/NpmPackage';
import { bumpTypeToString, SemVerBumpType } from './models/SemVerBumpType';
import { sortLessDependenciesFirst } from './utils/sortLessDependenciesFirst';
import { IFileSystemService, IFileSystemServiceKey } from './services/NodeFileSystemService';
import { ILogger, ILoggerKey } from './services/ConsoleLogger';
import {
  onPackageReleasedHooksRunner,
  onReleaseCompleteHooksRunner,
  PackageReleasedPluginContext,
  ReleaseCompletePluginContext,
  ReleasePlugin,
  releasePlugins,
} from './plugins/ReleasePlugin';
import { ConventionalCommit } from './models/ConventionalCommit';
import { HookContext, IContainer, inject, select } from 'ts-ioc-container';
import { VSCService, VSCServiceKey } from './plugins/vcs/services/VSCService';

type PackageName = string;
type PackageVersion = string;

export class Controller {
  private publicPackages: NpmPackage[] = [];

  constructor(
    @inject(releasePlugins) private readonly plugins: ReleasePlugin[],
    @inject(IFileSystemServiceKey) private fs: IFileSystemService,
    @inject(VSCServiceKey) private vsc: VSCService,
    @inject(ILoggerKey) private logger: ILogger,
    @inject(select.scope.current) private scope: IContainer,
  ) {}

  discoverPackages(): void {
    const { workspaces = [] } = this.fs.readPackageJsonOrFail('./');
    const packageJsonList = this.fs.findManyPackageJsonByGlob(workspaces);
    this.publicPackages = sortLessDependenciesFirst(
      packageJsonList.map(([pkgPath, pkg]) => NpmPackage.createFromPackage(pkg, pkgPath)).filter((p) => !p.isPrivate),
    );
  }

  release(): void {
    const releasedVersions = new Map<PackageName, PackageVersion>();
    const releasedCommits = new Map<PackageName, ConventionalCommit[]>();

    for (const pkg of this.publicPackages) {
      const pkgReleaseCommits = this.vsc.findManyCommitsSinceTag(pkg.getCommitTag()).filter((c) => c.matchesScope(pkg.name) && c.isReleaseTrigger());
      const dependencyUpdates = pkg.getDependencyUpdates(releasedVersions);
      const versionBump = Math.max(...pkgReleaseCommits.map((c) => c.bumpType), dependencyUpdates.length ? SemVerBumpType.MINOR : SemVerBumpType.NONE);

      if (versionBump === SemVerBumpType.NONE) {
        this.logStep('SKIP', `${pkg.name}@${pkg.version}`);
        continue;
      }

      const newVersion = pkg.getNewVersion(versionBump);
      releasedVersions.set(pkg.name, newVersion);
      releasedCommits.set(pkg.name, pkgReleaseCommits);
      this.logStep('BUMP', `${pkg.name} ${pkg.version} -> ${newVersion} (${bumpTypeToString(versionBump)})`);

      for (const plugin of this.plugins) {
        this.onPackageReleasedHook(plugin, {
          pkg: pkg,
          releasedVersions,
          releasedCommits: pkgReleaseCommits,
          releasedPackages: this.publicPackages.filter((pkg) => releasedVersions.has(pkg.name)),
        });
      }
    }

    for (const plugin of this.plugins) {
      this.onReleaseCompleteHook(plugin, {
        releasedVersions,
        releasedPackages: this.publicPackages.filter((pkg) => releasedVersions.has(pkg.name)),
        releasedCommits,
      });
    }
  }

  private logStep(step: 'SKIP' | 'BUMP', detail: string): void {
    this.logger.info(`${step.padEnd(8)} ${detail}`);
  }

  private onPackageReleasedHook(plugin: ReleasePlugin, context: PackageReleasedPluginContext) {
    onPackageReleasedHooksRunner.execute(plugin, {
      scope: this.scope,
      createContext: (Target, scope, methodName) => new HookContext(Target, scope, methodName).setInitialArgs(context),
    });
  }

  private onReleaseCompleteHook(plugin: ReleasePlugin, context: ReleaseCompletePluginContext) {
    onReleaseCompleteHooksRunner.execute(plugin, {
      scope: this.scope,
      createContext: (Target, scope, methodName) => new HookContext(Target, scope, methodName).setInitialArgs(context),
    });
  }
}

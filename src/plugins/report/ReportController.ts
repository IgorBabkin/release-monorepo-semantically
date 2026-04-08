import { bindTo, hook, IContainer, inject, register } from 'ts-ioc-container';
import { NpmPackage, PackageName, PackageVersion } from '../../models/NpmPackage';
import { IFileSystemServiceKey } from '../../services/NodeFileSystemService';
import { VSCService, VSCServiceKey } from '../vcs/services/VSCService';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { OutputService, OutputServiceKey } from '../../services/OutputService';
import { onDefault } from 'ib-commander';
import { execute } from '../../utils/hooks';
import { sortLessDependenciesFirst } from '../../utils/sortLessDependenciesFirst';
import { ConventionalCommit } from '../../models/ConventionalCommit';
import { bumpTypeToString, SemVerBumpType } from '../../models/SemVerBumpType';
import { serializeContext } from '../../models/ReleaseControllerContext';

@register(bindTo('report'))
export class ReportController {
  constructor(
    @inject(VSCServiceKey) private vsc: VSCService,
    @inject(ILoggerKey) private logger: ILogger,
    @inject(OutputServiceKey) private output: OutputService,
  ) {}

  @onDefault(execute())
  @hook('generate')
  generate(@inject(resolvePublicPackages) publicPackages: NpmPackage[]): void {
    const releasedVersions = new Map<PackageName, PackageVersion>();
    const releasedCommits = new Map<PackageName, ConventionalCommit[]>();

    for (const pkg of publicPackages) {
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
    }

    const body = serializeContext({
      releasedVersions,
      releasedPackages: publicPackages.filter((pkg) => releasedVersions.has(pkg.name)),
      releasedCommits,
    });

    this.output.write(body);
  }

  private logStep(step: 'SKIP' | 'BUMP', detail: string): void {
    this.logger.info(`${step.padEnd(8)} ${detail}`);
  }
}

export function resolvePublicPackages(c: IContainer): NpmPackage[] {
  const fs = IFileSystemServiceKey.resolve(c);
  const { workspaces = [] } = fs.readPackageJsonOrFail('./');
  const packageJsonList = fs.findManyPackageJsonByGlob(workspaces);
  return sortLessDependenciesFirst(packageJsonList.map(([pkgPath, pkg]) => NpmPackage.createFromPackage(pkg, pkgPath)).filter((p) => !p.isPrivate));
}

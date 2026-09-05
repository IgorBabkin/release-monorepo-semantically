import { bindTo, IContainer, inject, register } from 'ts-ioc-container';
import { NpmPackage, PackageName, PackageVersion } from '../../domain/NpmPackage.js';
import { IFileSystemServiceKey } from '../../services/NodeFileSystemService.js';
import { VSCService, VSCServiceKey } from '../vcs/services/VSCService.js';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { OutputService, OutputServiceKey } from '../../services/OutputService.js';
import { DirtyWorkingTreeException } from '../../exceptions/DomainException.js';
import { action, execute, onDefault } from '../../cli/index.js';
import { sortLessDependenciesFirst } from '../../utils/sortLessDependenciesFirst.js';
import { ConventionalCommit } from '../../domain/ConventionalCommit.js';
import { bumpTypeToString, SemVerBumpType } from '../../domain/SemVerBumpType.js';
import { serializeContext } from '../../domain/ReleaseControllerContext.js';

// Arrow function, not `function`: ts-ioc-container's token resolver treats any
// function with a `.prototype` as a class to `new`, which a plain function
// declaration has and an arrow function does not. Declared before the class
// so the constructor's @inject decorator (evaluated at class-definition time)
// isn't reading it out of its temporal dead zone.
export const resolvePublicPackages = (container: IContainer): NpmPackage[] => {
  const fs = IFileSystemServiceKey.resolve(container);
  const { workspaces = [] } = fs.readPackageJsonOrFail('./');
  const packageJsonList = fs.findManyPackageJsonByGlob(workspaces);
  return sortLessDependenciesFirst(packageJsonList.map(([pkgPath, pkg]) => NpmPackage.createFromPackage(pkg, pkgPath)).filter((p) => !p.isPrivate));
};

@register(bindTo('report'))
export class ReportController {
  constructor(
    @inject(VSCServiceKey) private vsc: VSCService,
    @inject(ILoggerKey.args('report')) private logger: ILogger,
    @inject(OutputServiceKey) private output: OutputService,
    @inject(resolvePublicPackages) private publicPackages: NpmPackage[],
  ) {}

  @onDefault(execute())
  @action('generate', execute())
  // No options parameter: `report` only reads the repository, so it has
  // nothing for --dry-run to suppress. Nothing parses argv for this action,
  // which is why a pipeline can still pass --dry-run to every step uniformly.
  generate(): void {
    // Checked here, not in `vcs commit`: the package-json/package-manager/
    // changelog steps are expected to leave the tree dirty, and `vcs commit`
    // stages everything with `git add .`. Catching pre-existing unrelated
    // changes has to happen before the pipeline starts, or they get swept
    // into the release commit.
    if (!this.vsc.isWorkingTreeClean()) {
      throw new DirtyWorkingTreeException();
    }

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
    }

    const body = serializeContext({
      releasedVersions,
      releasedPackages: this.publicPackages.filter((pkg) => releasedVersions.has(pkg.name)),
      releasedCommits,
    });

    this.output.write(body);
  }

  private logStep(step: 'SKIP' | 'BUMP', detail: string): void {
    this.logger.info(`${step.padEnd(8)} ${detail}`);
  }
}

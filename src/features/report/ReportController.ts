import { bindTo, IContainer, inject, register } from 'ts-ioc-container';
import { NpmPackage, PackageName, PackageVersion } from '../../domain/NpmPackage.js';
import { IFileSystemServiceKey } from '../../services/NodeFileSystemService.js';
import { VSCService, VSCServiceKey } from '../vcs/services/VSCService.js';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { OutputService, OutputServiceKey } from '../../services/OutputService.js';
import { DirtyWorkingTreeException } from '../../exceptions/DomainException.js';
import { action, command, execute, onDefault, schema } from '../../cli/index.js';
import { Command } from 'commander';
import { z } from 'zod';
import { constant as c } from '../../utils/utils.js';
import { sortLessDependenciesFirst } from '../../utils/sortLessDependenciesFirst.js';
import { ConventionalCommit } from '../../domain/ConventionalCommit.js';
import { bumpTypeToString, SemVerBumpType } from '../../domain/SemVerBumpType.js';
import { serializeContext } from '../../domain/ReleaseControllerContext.js';
import { buildReleasePlan, formatReleasePlan } from '../../domain/ReleasePlan.js';
import { DependencyVersionChange } from '../../domain/ReleaseTypes.js';

// `report` only reads the repository, so --dry-run is accepted (pipelines pass
// it to every step uniformly) and has nothing to suppress.
export const REPORT_OPTIONS = z.object({
  dryRun: z.boolean().default(false),
  verbose: z.boolean().default(false),
});

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
  @command(
    c(
      new Command()
        .option('--dry-run', 'Accepted for symmetry with the other steps; report never writes')
        .option('--verbose', 'Explain every package scanned, the commits and dependency updates behind each bump, and the resulting plan'),
    ),
  )
  @schema(c(REPORT_OPTIONS))
  @action('generate', execute())
  generate(options: z.infer<typeof REPORT_OPTIONS>): void {
    // Checked here, not in `vcs commit`: the package-json/package-manager/
    // changelog steps are expected to leave the tree dirty, and `vcs commit`
    // stages everything with `git add .`. Catching pre-existing unrelated
    // changes has to happen before the pipeline starts, or they get swept
    // into the release commit.
    if (!this.vsc.isWorkingTreeClean()) {
      throw new DirtyWorkingTreeException();
    }

    const { verbose } = options;
    const releasedVersions = new Map<PackageName, PackageVersion>();
    const releasedCommits = new Map<PackageName, ConventionalCommit[]>();

    if (verbose) {
      this.logStep(
        'SCAN',
        `${this.publicPackages.length} public package(s) in dependency order: ${this.publicPackages.map((p) => p.name).join(', ') || '(none)'}`,
      );
    }

    for (const pkg of this.publicPackages) {
      const sinceTag = pkg.getCommitTag();
      const commitsSinceTag = this.vsc.findManyCommitsSinceTag(sinceTag);
      const pkgReleaseCommits = commitsSinceTag.filter((c) => c.matchesScope(pkg.name) && c.isReleaseTrigger());
      const dependencyUpdates = pkg.getDependencyUpdates(releasedVersions);
      const versionBump = Math.max(...pkgReleaseCommits.map((c) => c.bumpType), dependencyUpdates.length ? SemVerBumpType.MINOR : SemVerBumpType.NONE);

      if (verbose) {
        this.explainPackage(pkg.name, sinceTag, commitsSinceTag.length, pkgReleaseCommits, dependencyUpdates);
      }

      if (versionBump === SemVerBumpType.NONE) {
        this.logStep('SKIP', `${pkg.name}@${pkg.version}`);
        continue;
      }

      const newVersion = pkg.getNewVersion(versionBump);
      releasedVersions.set(pkg.name, newVersion);
      releasedCommits.set(pkg.name, pkgReleaseCommits);
      this.logStep('BUMP', `${pkg.name} ${pkg.version} -> ${newVersion} (${bumpTypeToString(versionBump)})`);
    }

    const releaseContext = {
      releasedVersions,
      releasedPackages: this.publicPackages.filter((pkg) => releasedVersions.has(pkg.name)),
      releasedCommits,
    };

    if (verbose) {
      for (const line of formatReleasePlan(buildReleasePlan(releaseContext))) {
        this.logger.info(line);
      }
    }

    this.output.write(serializeContext(releaseContext));
  }

  /**
   * The reasoning behind one package's bump: what was scanned, which commits
   * counted, and which internal dependency updates forced a bump on their own.
   */
  private explainPackage(
    packageName: string,
    sinceTag: string,
    scannedCommits: number,
    releaseCommits: ConventionalCommit[],
    dependencyUpdates: DependencyVersionChange[],
  ): void {
    this.logStep('SCAN', `${packageName} ${scannedCommits} commit(s) since ${sinceTag}, ${releaseCommits.length} release-triggering`);

    for (const commit of releaseCommits) {
      this.logStep('SCAN', `${packageName} <- ${describeCommit(commit)}`);
    }

    for (const update of dependencyUpdates) {
      this.logStep(
        'DEPS',
        `${packageName} <- ${update.packageName} ${update.oldVersion} -> ${update.newVersion} in ${update.sections.join(', ')} (forces minor)`,
      );
    }
  }

  private logStep(step: 'SKIP' | 'BUMP' | 'SCAN' | 'DEPS', detail: string): void {
    this.logger.info(`${step.padEnd(8)} ${detail}`);
  }
}

function describeCommit(commit: ConventionalCommit): string {
  const scope = commit.scope ? `(${commit.scope})` : '';
  const hash = commit.hash ? ` [${commit.hash.slice(0, 7)}]` : '';
  return `${commit.type}${scope}${commit.isBreaking ? '!' : ''}: ${commit.subject}${hash} (${bumpTypeToString(commit.bumpType) ?? 'none'})`;
}

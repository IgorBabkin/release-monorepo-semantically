import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { inject, register } from 'ts-ioc-container';
import { z } from 'zod';
import { pluginsConfigService } from '../../services/PluginsConfigService.js';
import { PackageManager, PackageManagerKey } from './services/PackageManager.js';
import { IFileSystemService, IFileSystemServiceKey } from '../../services/NodeFileSystemService.js';
import { CONFIG_KEY, PLUGIN_CONFIG_SCHEMA } from './PackageManagerConfig.js';
import { action, execute, onDefault } from '../../cli/index.js';
import { deserializeContext } from '../../domain/ReleaseControllerContext.js';
import { isDryRun, parseOptions, STEP_OPTIONS, stepCommand, type StepOptions } from '../../utils/cli.js';
import { validate } from '../../utils/zod.js';
import { commandArgs } from '../../utils/ts-ioc-container.js';

@register('package-manager')
export class PackageManagerController {
  constructor(
    @inject(pluginsConfigService(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA>,
    @inject(PackageManagerKey) private readonly packageManager: PackageManager,
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(ILoggerKey.args('package-manager')) private readonly logger: ILogger,
  ) {}

  // Only the version bump runs by default; publishing is an explicit action so
  // that a pipeline cannot push to the registry by accident.
  @onDefault(execute())
  @action('bump-version', execute())
  bumpVersion(@inject(commandArgs, parseOptions(stepCommand()), validate(STEP_OPTIONS)) options: StepOptions): void {
    const { releasedPackages, releasedVersions } = deserializeContext(options.context);
    const dryRun = isDryRun(options, this.config);

    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name)!;
      if (dryRun) {
        this.logger.info(`SKIP     BUMP     ${pkg.name}@${newVersion} (dry-run)`);
        continue;
      }
      this.writeVersion(pkg.dirname, newVersion);
      this.logger.info(`BUMP     ${pkg.name}@${newVersion}`);
    }
  }

  /**
   * The bump is written straight into the manifest rather than through
   * `pnpm version`. `pnpm version` hands the command to npm, which rebuilds
   * the dependency tree before it writes: inside a pnpm workspace that dies on
   * the sibling manifests' `workspace:*` specifiers (`EUNSUPPORTEDPROTOCOL`,
   * a protocol npm only understands from a workspace root it has been pointed
   * at) and runs install lifecycle scripts — `postinstall` included — on a
   * tree the release step has no business rebuilding. It also writes the new
   * version before it fails, so a failed bump leaves the manifest changed.
   */
  private writeVersion(dirname: string, version: string): void {
    const packageJson = this.fs.readPackageJsonOrFail(dirname);
    packageJson.version = version;
    this.fs.writeToPackageJsonOrFail(dirname, packageJson);
  }

  @action('publish', execute())
  publishAllPackages(@inject(commandArgs, parseOptions(stepCommand()), validate(STEP_OPTIONS)) options: StepOptions): void {
    const { releasedPackages, releasedVersions } = deserializeContext(options.context);
    const dryRun = isDryRun(options, this.config);

    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name)!;
      if (dryRun) {
        this.logger.info(`SKIP     PUBLISH  ${pkg.name}@${newVersion} (dry-run)`);
        continue;
      }
      this.packageManager.publish(pkg.dirname);
      this.logger.info(`PUBLISH  ${pkg.name}@${newVersion}`);
    }
  }
}

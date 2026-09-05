import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { bindTo, inject, register } from 'ts-ioc-container';
import { z } from 'zod';
import { pluginsConfigService } from '../../services/PluginsConfigService.js';
import { PackageManager, PackageManagerKey } from './services/PackageManager.js';
import { CONFIG_KEY, PLUGIN_CONFIG_SCHEMA } from './PackageManagerConfig.js';
import { action, command, execute, onDefault, schema } from '../../cli/index.js';
import { constant as c } from '../../utils/utils.js';
import { deserializeContext } from '../../domain/ReleaseControllerContext.js';
import { createReleasePlanReporter } from '../../domain/ReleasePlan.js';
import { isDryRun, STEP_OPTIONS, stepCommand, type StepOptions } from '../../utils/cli.js';

@register(bindTo('package-manager'))
export class PackageManagerController {
  constructor(
    @inject(pluginsConfigService(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA>,
    @inject(PackageManagerKey) private readonly packageManager: PackageManager,
    @inject(ILoggerKey.args('package-manager')) private readonly logger: ILogger,
  ) {}

  private readonly reportPlan = createReleasePlanReporter((message) => this.logger.info(message));

  // Only the version bump runs by default; publishing is an explicit action so
  // that a pipeline cannot push to the registry by accident.
  @onDefault(execute())
  @command(c(stepCommand()))
  @schema(c(STEP_OPTIONS))
  @action('bump-version', execute())
  bumpVersion(options: StepOptions): void {
    const releaseContext = deserializeContext(options.context);
    this.reportPlan(releaseContext, options.verbose);
    const { releasedPackages, releasedVersions } = releaseContext;
    const dryRun = isDryRun(options, this.config);

    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name)!;
      if (dryRun) {
        this.logger.info(`SKIP     BUMP     ${pkg.name}@${newVersion} (dry-run)`);
        continue;
      }
      this.packageManager.bumpVersion(pkg.dirname, newVersion);
      this.logger.info(`BUMP     ${pkg.name}@${newVersion}`);
    }
  }

  @command(c(stepCommand()))
  @schema(c(STEP_OPTIONS))
  @action('publish', execute())
  publishAllPackages(options: StepOptions): void {
    const releaseContext = deserializeContext(options.context);
    this.reportPlan(releaseContext, options.verbose);
    const { releasedPackages, releasedVersions } = releaseContext;
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

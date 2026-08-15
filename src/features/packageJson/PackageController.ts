import { bindTo, inject, register } from 'ts-ioc-container';
import { IFileSystemService, IFileSystemServiceKey } from '../../services/NodeFileSystemService.js';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { z } from 'zod';
import { pluginsConfigService } from '../../services/PluginsConfigService.js';
import { CONFIG_KEY, PLUGIN_CONFIG_SCHEMA } from './PackageJsonConfig.js';
import { action, command, execute, onDefault, schema } from '../../cli/index.js';
import { constant as c } from '../../utils/utils.js';
import { deserializeContext } from '../../domain/ReleaseControllerContext.js';
import { isDryRun, STEP_OPTIONS, stepCommand, type StepOptions } from '../../utils/cli.js';

@register(bindTo('package-json'))
export class PackageController {
  constructor(
    @inject(pluginsConfigService(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA>,
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(ILoggerKey.args('package-json')) private readonly logger: ILogger,
  ) {}

  @onDefault(execute())
  @command(c(stepCommand()))
  @schema(c(STEP_OPTIONS))
  @action('update-dependencies', execute())
  updateDependencies(options: StepOptions): void {
    const { releasedPackages, releasedVersions } = deserializeContext(options.context);
    const dryRun = isDryRun(options, this.config);

    for (const pkg of releasedPackages) {
      const changes = pkg.getDependencyUpdates(releasedVersions);
      if (changes.length === 0) {
        continue;
      }

      const packageJson = this.fs.readPackageJsonOrFail(pkg.dirname);
      packageJson.dependencies ??= {};

      for (const change of changes) {
        packageJson.dependencies[change.packageName] = change.newVersion;
        this.logger.info(`BUMP     ${change.packageName}@${change.newVersion}`);
      }

      if (dryRun) {
        this.logger.info(`SKIP     SAVE     ${pkg.name} package.json (dry-run)`);
        continue;
      }

      this.fs.writeToPackageJsonOrFail(pkg.dirname, packageJson);
      this.logger.info(`SAVE     ${pkg.name} package.json`);
    }
  }
}

import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { execute } from '../../utils/hooks';
import { bindTo, hook, inject, register } from 'ts-ioc-container';
import { z } from 'zod';
import { pluginsConfigService } from '../../services/PluginsConfigService';
import { PackageManager, PackageManagerKey } from './services/PackageManager';
import { PLUGIN_CONFIG_SCHEMA } from './PackageManagerPluginConfig';
import { command, schema } from 'ib-commander';
import { Command } from 'commander';
import { constant as c } from '../../utils/utils';
import { deserializeContext } from '../../models/ReleaseControllerContext';

export const PACKAGE_MANAGER_OPTIONS = z.object({
  context: z.string(),
});

@register(bindTo('packageManager'))
export class PackageManagerController {
  constructor(
    @inject(pluginsConfigService('package-manager', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(PackageManagerKey) private readonly packageManager: PackageManager,
    @inject(ILoggerKey.args('PackageManagerPlugin')) private readonly logger: ILogger,
  ) {}

  @command(c(new Command().requiredOption('--context <value>', 'Semantic release report')))
  @schema(c(PACKAGE_MANAGER_OPTIONS))
  @hook('bump-version', execute())
  bumpVersion({ context }: z.infer<typeof PACKAGE_MANAGER_OPTIONS>): void {
    const { releasedPackages, releasedVersions } = deserializeContext(context);
    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name)!;
      if (this.config!.dryRun) {
        this.logger.info(`SKIP     BUMP     ${pkg.name}@${newVersion} (dry-run)`);
        continue;
      }
      this.packageManager.bumpVersion(pkg.dirname, newVersion);
      this.logger.info(`BUMP     ${pkg.name}@${newVersion}`);
    }
  }

  @command(c(new Command().requiredOption('--context <value>', 'Semantic release report')))
  @schema(c(PACKAGE_MANAGER_OPTIONS))
  @hook('publish', execute())
  publishAllPackages({ context }: z.infer<typeof PACKAGE_MANAGER_OPTIONS>): void {
    const { releasedPackages, releasedVersions } = deserializeContext(context);
    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name)!;
      if (this.config!.dryRun) {
        this.logger.info(`SKIP     PUBLISH      ${pkg.name}@${newVersion} (dry-run)`);
        continue;
      }
      this.packageManager.publish(pkg.dirname);
      this.logger.info(`PUBLISH  ${pkg.name}@${newVersion}`);
    }
  }
}

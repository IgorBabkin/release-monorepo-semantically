import { bindTo, hook, inject, register } from 'ts-ioc-container';
import { IFileSystemService, IFileSystemServiceKey } from '../../services/NodeFileSystemService';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { execute } from '../../utils/hooks';
import { z } from 'zod';
import { pluginsConfigService } from '../../services/PluginsConfigService';
import { PLUGIN_CONFIG_SCHEMA } from './PackageJsonPluginConfig';
import { command, schema } from 'ib-commander';
import { Command } from 'commander';
import { constant as c } from '../../utils/utils';
import { deserializeContext } from '../../models/ReleaseControllerContext';

export const PACKAGE_OPTIONS = z.object({
  context: z.string(),
});

@register(bindTo('package'))
export class PackageController {
  constructor(
    @inject(pluginsConfigService('package-json', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(ILoggerKey.args('PackageJsonPlugin')) private readonly logger: ILogger,
  ) {}

  @command(c(new Command().requiredOption('--context <value>', 'Semantic release report')))
  @schema(c(PACKAGE_OPTIONS))
  @hook('update-dependencies', execute())
  updateDependencies({ context }: z.infer<typeof PACKAGE_OPTIONS>): void {
    const { releasedPackages, releasedVersions } = deserializeContext(context);

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

      if (this.config!.dryRun) {
        this.logger.info(`SKIP     SAVE ${pkg.name} package.json (dry-run)`);
        continue;
      }

      this.fs.writeToPackageJsonOrFail(pkg.dirname, packageJson);
      this.logger.info(`SAVE    ${pkg.name} package.json`);
    }
  }
}

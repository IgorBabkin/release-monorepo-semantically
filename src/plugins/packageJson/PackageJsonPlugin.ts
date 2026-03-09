import { onPackageReleasedHook, PackageReleasedPluginContext, ReleasePlugin, ReleasePluginKey } from '../ReleasePlugin';
import { IFileSystemService, IFileSystemServiceKey } from '../../services/NodeFileSystemService';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { execute } from '../../utils/hooks';
import { z } from 'zod';
import { bindTo, inject, register } from 'ts-ioc-container';
import { pluginConfig } from '../../models/PluginConfig';

const PLUGIN_CONFIG_SCHEMA = z.object({
  disabled: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  priority: z.number().optional(),
});

@register(bindTo(ReleasePluginKey))
export class PackageJsonPlugin implements ReleasePlugin {
  constructor(
    @inject(pluginConfig('package-json', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(ILoggerKey.args('PackageJsonPlugin')) private readonly logger: ILogger,
  ) {}

  get priority(): number {
    return this.config?.priority ?? 0;
  }

  @onPackageReleasedHook(execute())
  updateDependencies({ pkg, releasedVersions }: PackageReleasedPluginContext) {
    if (!this.config || this.config.disabled) {
      return;
    }

    const changes = pkg.getDependencyUpdates(releasedVersions);
    if (changes.length === 0) {
      return;
    }

    const packageJson = this.fs.readPackageJsonOrFail(pkg.dirname);

    packageJson.dependencies ??= {};

    for (const change of changes) {
      packageJson.dependencies[change.packageName] = change.newVersion;
      this.logger.info(`BUMP     ${change.packageName}@${change.newVersion}`);
    }

    if (this.config.dryRun) {
      this.logger.info(`SKIP     SAVE ${pkg.name} package.json (dry-run)`);
      return;
    }

    this.fs.writeToPackageJsonOrFail(pkg.dirname, packageJson);
    this.logger.info(`SAVE    ${pkg.name} package.json`);
  }
}

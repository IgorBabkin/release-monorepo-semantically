
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import {
  onPackageReleasedHook,
  onReleaseCompleteHook,
  PackageReleasedPluginContext,
  ReleaseCompletePluginContext,
  ReleasePlugin,
  ReleasePluginKey,
} from '../ReleasePlugin';
import { execute } from '../../utils/hooks';
import { bindTo, inject, register, scope } from 'ts-ioc-container';
import { z } from 'zod';
import { IPluginsConfigServiceKey, pluginConfig } from '../../models/PluginConfig';
import { PackageManager, PackageManagerKey } from './services/PackageManager';

const PLUGIN_CONFIG_SCHEMA = z.object({
  disabled: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  priority: z.number().optional(),
  kind: z.enum(['npm', 'pnpm', 'yarn']),
});

type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;

export const whenPackageManagerConfigEqual = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const config = IPluginsConfigServiceKey.resolve(c).getConfigAndCache('release-notes', PLUGIN_CONFIG_SCHEMA);
    return prev && config !== null && config[key] === value;
  });

@register(bindTo(ReleasePluginKey))
export class PackageManagerPlugin implements ReleasePlugin {
  private readonly pluginConfig: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null;

  constructor(
    @inject(pluginConfig('package-manager', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(PackageManagerKey) private readonly packageManager: PackageManager,
    @inject(ILoggerKey.args('PackageManagerPlugin')) private readonly logger: ILogger,
  ) {
    this.pluginConfig = config ? PLUGIN_CONFIG_SCHEMA.parse(config) : null;
  }

  get priority(): number {
    return this.config?.priority ?? 0;
  }

  @onPackageReleasedHook(execute())
  bumpVersion(context: PackageReleasedPluginContext): void {
    if (!this.pluginConfig || this.pluginConfig.disabled) {
      return;
    }
    const { pkg, releasedVersions } = context;
    const newVersion = releasedVersions.get(pkg.name)!;
    if (this.pluginConfig.dryRun) {
      this.logger.info(`SKIP     BUMP     ${pkg.name}@${newVersion} (dry-run)`);
      return;
    }
    this.packageManager.bumpVersion(pkg.dirname, newVersion);
    this.logger.info(`BUMP     ${pkg.name}@${newVersion}`);
  }

  @onReleaseCompleteHook(execute())
  publishAllPackages(context: ReleaseCompletePluginContext): void {
    if (!this.pluginConfig || this.pluginConfig.disabled) {
      return;
    }

    const { releasedPackages, releasedVersions } = context;
    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name)!;
      if (this.pluginConfig!.dryRun) {
        this.logger.info(`SKIP     PUBLISH      ${pkg.name}@${newVersion} (dry-run)`);
        continue;
      }
      this.packageManager.publish(pkg.dirname);
      this.logger.info(`PUBLISH  ${pkg.name}@${newVersion}`);
    }
  }
}

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
import { bindTo, inject, register } from 'ts-ioc-container';
import { z } from 'zod';
import { pluginsConfigService } from '../../services/PluginsConfigService';
import { PackageManager, PackageManagerKey } from './services/PackageManager';
import { PLUGIN_CONFIG_SCHEMA } from './PackageManagerPluginConfig';

@register(bindTo(ReleasePluginKey))
export class PackageManagerPlugin implements ReleasePlugin {
  constructor(
    @inject(pluginsConfigService('package-manager', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(PackageManagerKey) private readonly packageManager: PackageManager,
    @inject(ILoggerKey.args('PackageManagerPlugin')) private readonly logger: ILogger,
  ) {}

  get priority(): number {
    return this.config?.priority ?? 0;
  }

  get disabled(): boolean {
    return this.config?.disabled ?? false;
  }

  @onPackageReleasedHook(execute())
  bumpVersion(context: PackageReleasedPluginContext): void {
    const { pkg, releasedVersions } = context;
    const newVersion = releasedVersions.get(pkg.name)!;
    if (this.config!.dryRun) {
      this.logger.info(`SKIP     BUMP     ${pkg.name}@${newVersion} (dry-run)`);
      return;
    }
    this.packageManager.bumpVersion(pkg.dirname, newVersion);
    this.logger.info(`BUMP     ${pkg.name}@${newVersion}`);
  }

  @onReleaseCompleteHook(execute())
  publishAllPackages(context: ReleaseCompletePluginContext): void {
    const { releasedPackages, releasedVersions } = context;
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

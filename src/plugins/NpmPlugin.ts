import { PackageManager } from '../services/PackageManager';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { PackageReleasedPluginContext, ReleaseCompletePluginContext, ReleasePlugin } from './ReleasePlugin';
import { ReleasePluginConfig } from '../models/ReleasePluginConfig';

export class NpmPlugin implements ReleasePlugin {
  constructor(
    private packageManager: PackageManager,
    private logger: ConsoleLogger,
    private readonly pluginConfig: ReleasePluginConfig = { name: 'npm' },
  ) {}

  onPackageReleased({ dryRun, pkg, releasedVersions }: PackageReleasedPluginContext) {
    if (this.pluginConfig.disabled) {
      return;
    }

    if (dryRun) {
      this.logger.info(`SKIP     ${pkg.name} version bump (dry-run)`);
      return;
    }
    const newVersion = releasedVersions.get(pkg.name)!;
    this.packageManager.bumpVersion(pkg.dirname, newVersion);
  }

  onReleaseComplete({ dryRun, noPublish, releasedPackages, releasedVersions }: ReleaseCompletePluginContext): void {
    if (this.pluginConfig.disabled) {
      return;
    }

    if (dryRun) {
      this.logger.info('SKIP     npm publish (dry-run)');
      return;
    }

    if (noPublish) {
      return;
    }

    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name)!;
      this.packageManager.publish(pkg.dirname);
      this.logger.info(`PUBLISH  ${pkg.name}@${newVersion}`);
    }
  }
}

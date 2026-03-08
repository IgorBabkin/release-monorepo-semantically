import { PackageManager } from '../services/PackageManager';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { PackageReleasedPluginContext, ReleaseCompletePluginContext, ReleasePlugin } from './ReleasePlugin';

export class NpmPlugin implements ReleasePlugin {
  constructor(
    private packageManager: PackageManager,
    private logger: ConsoleLogger,
  ) {}

  onPackageReleased({ pkg, releasedVersions }: PackageReleasedPluginContext) {
    const newVersion = releasedVersions.get(pkg.name)!;
    this.packageManager.bumpVersion(pkg.dirname, newVersion);
  }

  onReleaseComplete({ noPublish, releasedPackages, releasedVersions }: ReleaseCompletePluginContext): void {
    if (!noPublish) {
      return;
    }

    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name)!;
      this.packageManager.publish(pkg.dirname);
      this.logger.info(`PUBLISH  ${pkg.name}@${newVersion}`);
    }
  }
}

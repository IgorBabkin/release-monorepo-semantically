import { PackageReleasedPluginContext, ReleasePlugin } from './ReleasePlugin';
import { NodeFileSystemService } from '../services/NodeFileSystemService';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { ReleasePluginConfig } from '../models/ReleasePluginConfig';

export class PackageJsonPlugin implements ReleasePlugin {
  constructor(
    private readonly fileSystemService: NodeFileSystemService,
    private readonly logger: ConsoleLogger,
    private readonly pluginConfig: ReleasePluginConfig = { name: 'package-json' },
  ) {}

  onPackageReleased({ dryRun, pkg, releasedVersions }: PackageReleasedPluginContext) {
    if (this.pluginConfig.disabled) {
      return;
    }

    if (dryRun) {
      this.logger.info(`SKIP     ${pkg.name} package.json (dry-run)`);
      return;
    }

    const changes = pkg.getDependencyUpdates(releasedVersions);
    if (changes.length === 0) {
      return;
    }

    const packageJson = this.fileSystemService.readPackageJsonOrFail(pkg.dirname);

    packageJson.dependencies ??= {};

    for (const change of changes) {
      packageJson.dependencies[change.packageName] = change.newVersion;
    }

    this.fileSystemService.writeToPackageJsonOrFail(pkg.dirname, packageJson);
    this.logger.info(`WRITE    ${pkg.name} package.json`);
  }
}

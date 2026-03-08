import { PackageReleasedPluginContext, ReleasePlugin } from './ReleasePlugin';
import { NodeFileSystemService } from '../services/NodeFileSystemService';
import { ConsoleLogger } from '../services/ConsoleLogger';

export class PackageJsonPlugin implements ReleasePlugin {
  constructor(
    private readonly fileSystemService: NodeFileSystemService,
    private readonly logger: ConsoleLogger,
  ) {}

  onPackageReleased({ pkg, releasedVersions }: PackageReleasedPluginContext) {
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
  }
}

import path from 'node:path';
import { ChangelogView } from '../services/ChangelogView';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { PackageReleasedPluginContext, ReleasePlugin } from './ReleasePlugin';
import { NodeFileSystemService } from '../services/NodeFileSystemService';
import { ReleasePluginConfig } from '../models/ReleasePluginConfig';

export class ChangelogPlugin implements ReleasePlugin {
  constructor(
    private readonly changelogName: string,
    private readonly view: ChangelogView,
    private readonly fs: NodeFileSystemService,
    private readonly logger: ConsoleLogger,
    private readonly pluginConfig: ReleasePluginConfig = { name: 'changelog' },
  ) {}

  onPackageReleased({ dryRun, pkg, releasedCommits, releasedVersions, releasedPackages }: PackageReleasedPluginContext): void {
    if (this.pluginConfig.disabled) {
      return;
    }

    if (dryRun) {
      this.logger.info(`SKIP     ${pkg.name} ${this.changelogName} (dry-run)`);
      return;
    }

    const changelogFile = path.resolve(pkg.dirname, this.changelogName);
    const content = this.view.render({
      pkg,
      releasedPackages,
      releasedVersions,
      releasedCommits,
      existing: this.fs.fileExists(changelogFile) ? this.fs.readFile(changelogFile) : '',
    });
    this.fs.writeFile(changelogFile, content);
    this.logger.info(`WRITE    ${pkg.name} ${this.changelogName}`);
  }
}

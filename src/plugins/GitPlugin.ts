import { ReleaseCommitView } from '../services/ReleaseCommitView';
import { GitService } from '../services/GitService';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { ReleaseCompletePluginContext, ReleasePlugin } from './ReleasePlugin';

export class GitPlugin implements ReleasePlugin {
  constructor(
    private vcsService: GitService,
    private releaseCommitView: ReleaseCommitView,
    private logger: ConsoleLogger,
  ) {}

  onReleaseComplete(context: ReleaseCompletePluginContext): void {
    if (context.dryRun) {
      return;
    }
    this.commitChanges(context);
    this.createTags(context);
    this.pushChanges(context);
  }

  private commitChanges(context: ReleaseCompletePluginContext) {
    const commitMessage = this.releaseCommitView.render(context);
    this.vcsService.commit(commitMessage);
  }

  private createTags({ releasedPackages, releasedVersions }: ReleaseCompletePluginContext) {
    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name);
      this.vcsService.createTag(`${pkg.name}@${newVersion}`);
      this.logger.info(`TAG      ${pkg.name}@${newVersion}`);
    }
  }

  private pushChanges({ noPush, releasedPackages }: ReleaseCompletePluginContext) {
    if (noPush) {
      return;
    }
    this.vcsService.push(releasedPackages.length > 0);
    this.logger.info(`PUSH     HEAD${releasedPackages.length > 0 ? ` and ${releasedPackages.length} tag(s)` : ''}`);
  }
}

import { ReleaseCompletePluginContext, ReleasePlugin } from './ReleasePlugin';
import { GithubService } from '../services/GithubService';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { GithubReleaseView } from '../services/GithubReleaseView';

export interface GithubPluginConfig {
  isGithubActions: boolean;
  repository?: string;
  token?: string;
}

export class GithubPlugin implements ReleasePlugin {
  constructor(
    private readonly githubService: GithubService,
    private readonly logger: ConsoleLogger,
    private readonly config: GithubPluginConfig,
    private readonly githubReleaseView: GithubReleaseView,
  ) {}

  onReleaseComplete(context: ReleaseCompletePluginContext): void {
    if (context.dryRun || context.noPush) {
      return;
    }

    if (!this.config.isGithubActions || !this.config.repository || !this.config.token) {
      return;
    }

    if (!this.githubService.isCliAvailable()) {
      throw new Error('GitHub release creation requires `gh` CLI when running in GitHub Actions');
    }

    for (const pkg of context.releasedPackages) {
      const version = context.releasedVersions.get(pkg.name);
      if (!version) {
        continue;
      }

      this.githubService.createRelease({
        repository: this.config.repository,
        token: this.config.token,
        tagName: `${pkg.name}@${version}`,
        title: `${pkg.name} v${version}`,
        notes: this.githubReleaseView.render({
          packageName: pkg.name,
          version,
          commits: context.releasedCommits.get(pkg.name) ?? [],
          dependencyUpdates: pkg.getDependencyUpdates(context.releasedVersions),
        }),
        prerelease: version.includes('-'),
      });
      this.logger.info(`RELEASE  ${pkg.name}@${version}`);
    }
  }
}

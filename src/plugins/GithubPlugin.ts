import { ReleaseCompletePluginContext, ReleasePlugin } from './ReleasePlugin';
import { GithubService } from '../services/GithubService';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { ConventionalCommit } from '../models/ConventionalCommit';

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
        notes: this.buildReleaseNotes(pkg, version, context.releasedVersions, context.releasedCommits.get(pkg.name) ?? []),
        prerelease: version.includes('-'),
      });
      this.logger.info(`RELEASE  ${pkg.name}@${version}`);
    }
  }

  private buildReleaseNotes(
    pkg: ReleaseCompletePluginContext['releasedPackages'][number],
    version: string,
    releasedVersions: Map<string, string>,
    commits: ConventionalCommit[],
  ): string {
    const lines: string[] = [`## ${pkg.name}@${version}`];

    if (commits.length > 0) {
      lines.push('', '### Changes');
      for (const commit of commits) {
        lines.push(`- ${commit.type}${commit.isBreaking ? '!' : ''}: ${commit.subject}`);
      }
    }

    const dependencyUpdates = pkg.getDependencyUpdates(releasedVersions);
    if (dependencyUpdates.length > 0) {
      lines.push('', '### Dependencies');
      for (const dependency of dependencyUpdates) {
        lines.push(`- update ${dependency.packageName} from ${dependency.oldVersion} to ${dependency.newVersion}`);
      }
    }

    if (commits.length === 0 && dependencyUpdates.length === 0) {
      lines.push('', '- No direct changes in this release');
    }

    return lines.join('\n');
  }
}

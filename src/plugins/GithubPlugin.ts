import { ReleaseCompletePluginContext, ReleasePlugin } from './ReleasePlugin';
import { GithubService } from '../services/GithubService';
import { ConsoleLogger } from '../services/ConsoleLogger';
import { GithubReleaseView } from '../services/GithubReleaseView';
import { GithubCliUnavailableException } from '../exceptions/DomainException';
import { z } from 'zod';
import { ReleasePluginConfig } from '../models/ReleasePluginConfig';

export interface GithubPluginConfig {
  isGithubActions: boolean;
  repository?: string;
  token?: string;
}

const githubActionsSchema = z.string().trim().toLowerCase();
const githubRepositorySchema = z
  .string()
  .trim()
  .regex(/^[^/\s]+\/[^/\s]+$/);
const githubTokenSchema = z.string().trim().min(1);

export class GithubPlugin implements ReleasePlugin {
  static createFromEnv(
    githubService: GithubService,
    logger: ConsoleLogger,
    githubReleaseView: GithubReleaseView,
    pluginConfig: ReleasePluginConfig = { name: 'github' },
    env: NodeJS.ProcessEnv = process.env,
  ): GithubPlugin {
    return new GithubPlugin(githubService, logger, GithubPlugin.readConfigFromEnv(env), githubReleaseView, pluginConfig);
  }

  constructor(
    private readonly githubService: GithubService,
    private readonly logger: ConsoleLogger,
    private readonly config: GithubPluginConfig,
    private readonly githubReleaseView: GithubReleaseView,
    private readonly pluginConfig: ReleasePluginConfig = { name: 'github' },
  ) {}

  onReleaseComplete(context: ReleaseCompletePluginContext): void {
    if (this.pluginConfig.disabled) {
      return;
    }

    if (context.dryRun) {
      this.logger.info('SKIP     github releases (dry-run)');
      return;
    }

    if (context.noPush) {
      return;
    }

    if (!this.config.isGithubActions || !this.config.repository || !this.config.token) {
      return;
    }

    if (!this.githubService.isCliAvailable()) {
      throw new GithubCliUnavailableException();
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

  private static readConfigFromEnv(env: NodeJS.ProcessEnv): GithubPluginConfig {
    const githubActionsParse = githubActionsSchema.safeParse(env.GITHUB_ACTIONS);
    const repositoryParse = githubRepositorySchema.safeParse(env.GITHUB_REPOSITORY);
    const tokenParse = githubTokenSchema.safeParse(env.GITHUB_TOKEN);

    return {
      isGithubActions: githubActionsParse.success && githubActionsParse.data === 'true',
      repository: repositoryParse.success ? repositoryParse.data : undefined,
      token: tokenParse.success ? tokenParse.data : undefined,
    };
  }
}

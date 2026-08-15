import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { GithubCliUnavailableException, MissingGithubCredentialsException } from '../../exceptions/DomainException.js';
import { z } from 'zod';
import { bindTo, inject, register } from 'ts-ioc-container';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService.js';
import { pluginsConfigService } from '../../services/PluginsConfigService.js';
import { globalConfig } from '../../domain/GlobalConfig.js';
import { ReleaseNotesService, ReleaseNotesServiceKey } from './services/ReleaseNotesService.js';
import { CONFIG_KEY, PLUGIN_CONFIG_SCHEMA } from './ReleaseNotesConfig.js';
import { action, command, execute, onDefault, schema } from '../../cli/index.js';
import { constant as c } from '../../utils/utils.js';
import { deserializeContext } from '../../domain/ReleaseControllerContext.js';
import { isDryRun, STEP_OPTIONS, stepCommand } from '../../utils/cli.js';

export const RELEASE_NOTES_OPTIONS = STEP_OPTIONS.extend({
  template: z.string().trim().optional(),
});

const releaseNotesCommand = () => stepCommand().option('--template <path>', 'Handlebars template for release notes');

@register(bindTo('release-notes'))
export class ReleaseNotesController {
  constructor(
    @inject(pluginsConfigService(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA>,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(ReleaseNotesServiceKey) private readonly githubService: ReleaseNotesService,
    @inject(ILoggerKey.args('release-notes')) private readonly logger: ILogger,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
  ) {}

  @onDefault(execute())
  @command(c(releaseNotesCommand()))
  @schema(c(RELEASE_NOTES_OPTIONS))
  @action('create', execute())
  createGithubRelease(options: z.infer<typeof RELEASE_NOTES_OPTIONS>): void {
    const releaseContext = deserializeContext(options.context);
    const { releasedPackages, releasedVersions } = releaseContext;
    if (releasedPackages.length === 0) {
      return;
    }

    const dryRun = isDryRun(options, this.config);
    const template = options.template ?? this.config.template;
    const { repository, token } = this.resolveCredentials(dryRun);

    if (!dryRun && !this.githubService.isCliAvailable()) {
      throw new GithubCliUnavailableException();
    }

    for (const pkg of releasedPackages) {
      const version = releasedVersions.get(pkg.name);
      if (!version) {
        continue;
      }

      if (dryRun) {
        this.logger.info(`SKIP     RELEASE  ${pkg.name}@${version} (dry-run)`);
        continue;
      }

      const cwd = template ? this.cwd : import.meta.dirname;
      // The default template renders a single package's notes, so it takes a
      // flat view rather than the full multi-package release context.
      const templateData = {
        packageName: pkg.name,
        version,
        commits: releaseContext.releasedCommits.get(pkg.name) ?? [],
        dependencyUpdates: pkg.getDependencyUpdates(releasedVersions),
      };
      this.githubService.createRelease({
        repository,
        token,
        tagName: `${pkg.name}@${version}`,
        title: `${pkg.name} v${version}`,
        notes: this.renderService.render(template ?? './github-release-notes.hbs', templateData, { cwd }),
        prerelease: version.includes('-'),
      });
      this.logger.info(`RELEASE  ${pkg.name}@${version}`);
    }
  }

  // Configuration wins, then the environment GitHub Actions already provides.
  private resolveCredentials(dryRun: boolean): { repository: string; token: string } {
    const repository = this.config.repository ?? process.env.GITHUB_REPOSITORY;
    const token = this.config.token ?? process.env.GITHUB_TOKEN;

    if (!repository || !token) {
      if (dryRun) {
        return { repository: repository ?? '', token: token ?? '' };
      }
      throw new MissingGithubCredentialsException();
    }

    return { repository, token };
  }
}

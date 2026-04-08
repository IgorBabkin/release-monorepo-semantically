import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { GithubCliUnavailableException } from '../../exceptions/DomainException';
import { z } from 'zod';
import { bindTo, hook, inject, register } from 'ts-ioc-container';
import { execute } from '../../utils/hooks';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService';
import { pluginsConfigService } from '../../services/PluginsConfigService';
import { globalConfig } from '../../models/GlobalConfig';
import { ReleaseNotesService, ReleaseNotesServiceKey } from './services/ReleaseNotesService';
import { PLUGIN_CONFIG_SCHEMA } from './ReleaseNotesPluginConfig';
import { command, schema } from 'ib-commander';
import { Command } from 'commander';
import { constant as c } from '../../utils/utils';
import { deserializeContext } from '../../models/ReleaseControllerContext';

export const RELEASE_NOTES_OPTIONS = z.object({
  context: z.string(),
});

@register(bindTo('releaseNotes'))
export class ReleaseNotesController {
  constructor(
    @inject(pluginsConfigService('release-notes', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(ReleaseNotesServiceKey) private readonly githubService: ReleaseNotesService,
    @inject(ILoggerKey.args('ReleaseNotesPlugin')) private readonly logger: ILogger,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
  ) {}

  @command(c(new Command().requiredOption('--context <value>', 'Semantic release report')))
  @schema(c(RELEASE_NOTES_OPTIONS))
  @hook('create', execute())
  createGithubRelease({ context }: z.infer<typeof RELEASE_NOTES_OPTIONS>): void {
    const { repository, token, template } = this.config!;
    const releaseContext = deserializeContext(context);
    const { releasedPackages, releasedVersions } = releaseContext;

    if (!this.githubService.isCliAvailable()) {
      throw new GithubCliUnavailableException();
    }

    for (const pkg of releasedPackages) {
      const version = releasedVersions.get(pkg.name);
      if (!version) {
        continue;
      }

      if (this.config!.dryRun) {
        this.logger.info(`SKIP   RELEASE  ${pkg.name}@${version}`);
        continue;
      }
      const cwd = template ? this.cwd : __dirname;
      this.githubService.createRelease({
        repository,
        token,
        tagName: `${pkg.name}@${version}`,
        title: `${pkg.name} v${version}`,
        notes: this.renderService.render(template ?? './releaseNotes-release-notes.hbs', releaseContext, { cwd }),
        prerelease: version.includes('-'),
      });
      this.logger.info(`RELEASE  ${pkg.name}@${version}`);
    }
  }
}

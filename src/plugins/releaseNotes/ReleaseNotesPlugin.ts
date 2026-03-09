import { onReleaseCompleteHook, ReleaseCompletePluginContext, ReleasePlugin, ReleasePluginKey } from '../ReleasePlugin';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { GithubCliUnavailableException } from '../../exceptions/DomainException';
import { z } from 'zod';
import { bindTo, inject, register } from 'ts-ioc-container';
import { execute } from '../../utils/hooks';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService';
import { pluginConfig } from '../../models/PluginConfig';
import { globalConfig } from '../../models/GlobalConfig';
import { ReleaseNotesService, ReleaseNotesServiceKey } from './services/ReleaseNotesService';

const PLUGIN_CONFIG_SCHEMA = z.object({
  repository: z
    .string()
    .trim()
    .regex(/^[^/\s]+\/[^/\s]+$/),
  token: z.string().trim().min(1),
  disabled: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  template: z.string().optional(),
  priority: z.number().optional(),
});

@register(bindTo(ReleasePluginKey))
export class ReleaseNotesPlugin implements ReleasePlugin {
  constructor(
    @inject(pluginConfig('release-notes', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(ReleaseNotesServiceKey) private readonly githubService: ReleaseNotesService,
    @inject(ILoggerKey.args('GithubPlugin')) private readonly logger: ILogger,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
  ) {}

  get priority(): number {
    return this.config?.priority ?? 0;
  }

  @onReleaseCompleteHook(execute())
  createGithubRelease(context: ReleaseCompletePluginContext): void {
    if (!this.config || this.config.disabled) {
      return;
    }

    const { repository, token, template } = this.config!;
    const { releasedPackages, releasedVersions } = context;

    if (!this.githubService.isCliAvailable()) {
      throw new GithubCliUnavailableException();
    }

    for (const pkg of releasedPackages) {
      const version = releasedVersions.get(pkg.name);
      if (!version) {
        continue;
      }

      if (this.config.dryRun) {
        this.logger.info(`SKIP   RELEASE  ${pkg.name}@${version}`);
        continue;
      }
      const cwd = template ? this.cwd : __dirname;
      this.githubService.createRelease({
        repository,
        token,
        tagName: `${pkg.name}@${version}`,
        title: `${pkg.name} v${version}`,
        notes: this.renderService.render(template ?? './releaseNotes-release-notes.hbs', context, { cwd }),
        prerelease: version.includes('-'),
      });
      this.logger.info(`RELEASE  ${pkg.name}@${version}`);
    }
  }
}

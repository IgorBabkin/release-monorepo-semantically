import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { onReleaseCompleteHook, ReleaseCompletePluginContext, ReleasePlugin, ReleasePluginKey } from '../ReleasePlugin';
import { DirtyWorkingTreeException } from '../../exceptions/DomainException';
import { execute } from '../../utils/hooks';
import { z } from 'zod';
import { bindTo, inject, register } from 'ts-ioc-container';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService';
import { pluginsConfigService } from '../../services/PluginsConfigService';
import { globalConfig } from '../../models/GlobalConfig';
import { VSCService, VSCServiceKey } from './services/VSCService';
import { PLUGIN_CONFIG_SCHEMA } from './VCSPluginConfig';

@register(bindTo(ReleasePluginKey))
export class VCSPlugin implements ReleasePlugin {
  constructor(
    @inject(pluginsConfigService('vcs', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(VSCServiceKey) private readonly vcs: VSCService,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
    @inject(ILoggerKey.args('GitPlugin')) private readonly logger: ILogger,
  ) {}

  get priority(): number {
    return this.config?.priority ?? 0;
  }

  get disabled(): boolean {
    return this.config?.disabled ?? false;
  }

  @onReleaseCompleteHook(execute())
  commitChanges(context: ReleaseCompletePluginContext) {
    this.validateVCS();

    const { template } = this.config!;
    const cwd = template ? this.cwd : __dirname;
    const commitMessage = this.renderService.render(template ?? './release-commit-msg.hbs', context, { cwd });
    this.vcs.commit(commitMessage);
  }

  @onReleaseCompleteHook(execute())
  createTags(context: ReleaseCompletePluginContext) {
    this.validateVCS();

    const { releasedPackages, releasedVersions } = context;
    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name);
      this.vcs.createTag(`${pkg.name}@${newVersion}`);
      this.logger.info(`TAG      ${pkg.name}@${newVersion}`);
    }
  }

  @onReleaseCompleteHook(execute())
  pushChanges(context: ReleaseCompletePluginContext) {
    this.validateVCS();

    const { releasedPackages } = context;
    this.vcs.push(releasedPackages.length > 0);
    this.logger.info(`PUSH     HEAD${releasedPackages.length > 0 ? ` and ${releasedPackages.length} tag(s)` : ''}`);
  }

  private validateVCS(): void {
    if (!this.vcs.isWorkingTreeClean()) {
      throw new DirtyWorkingTreeException();
    }
  }
}

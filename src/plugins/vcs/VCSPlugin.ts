
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { onPackageReleasedHook, ReleaseCompletePluginContext, ReleasePlugin, ReleasePluginKey } from '../ReleasePlugin';
import { DirtyWorkingTreeException } from '../../exceptions/DomainException';
import { execute } from '../../utils/hooks';
import { z } from 'zod';
import { bindTo, inject, register } from 'ts-ioc-container';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService';
import { pluginConfig } from '../../models/PluginConfig';
import { globalConfig } from '../../models/GlobalConfig';
import { VSCService, VSCServiceKey } from './services/VSCService';

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
export class VCSPlugin implements ReleasePlugin {
  constructor(
    @inject(pluginConfig('vcs', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(VSCServiceKey) private readonly vcs: VSCService,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
    @inject(ILoggerKey.args('GitPlugin')) private readonly logger: ILogger,
  ) {}

  get priority(): number {
    return this.config?.priority ?? 0;
  }

  @onPackageReleasedHook(execute())
  commitChanges(context: ReleaseCompletePluginContext) {
    if (!this.config || this.config.disabled) {
      this.logger.info('SKIP     commitChanges (disabled)');
      return true;
    }
    this.validateVCS();

    const { template } = this.config!;
    const cwd = template ? this.cwd : __dirname;
    const commitMessage = this.renderService.render(template ?? './release-commit-msg.hbs', context, { cwd });
    this.vcs.commit(commitMessage);
  }

  @onPackageReleasedHook(execute())
  createTags(context: ReleaseCompletePluginContext) {
    if (!this.config || this.config.disabled) {
      this.logger.info('SKIP     createTags (disabled)');
      return true;
    }
    this.validateVCS();

    const { releasedPackages, releasedVersions } = context;
    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name);
      this.vcs.createTag(`${pkg.name}@${newVersion}`);
      this.logger.info(`TAG      ${pkg.name}@${newVersion}`);
    }
  }

  @onPackageReleasedHook(execute())
  pushChanges(context: ReleaseCompletePluginContext) {
    if (!this.config || this.config.disabled) {
      this.logger.info('SKIP     pushChanges (disabled)');
      return true;
    }
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

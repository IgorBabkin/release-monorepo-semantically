import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { DirtyWorkingTreeException } from '../../exceptions/DomainException';
import { execute } from '../../utils/hooks';
import { z } from 'zod';
import { bindTo, hook, inject, register } from 'ts-ioc-container';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService';
import { pluginsConfigService } from '../../services/PluginsConfigService';
import { globalConfig } from '../../models/GlobalConfig';
import { VSCService, VSCServiceKey } from './services/VSCService';
import { PLUGIN_CONFIG_SCHEMA } from './VCSPluginConfig';
import { command, schema } from 'ib-commander';
import { Command } from 'commander';
import { constant as c } from '../../utils/utils';
import { deserializeContext } from '../../models/ReleaseControllerContext';

export const VCS_OPTIONS = z.object({
  context: z.string(),
});

@register(bindTo('vcs'))
export class VCSController {
  constructor(
    @inject(pluginsConfigService('vcs', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(VSCServiceKey) private readonly vcs: VSCService,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
    @inject(ILoggerKey.args('GitPlugin')) private readonly logger: ILogger,
  ) {}

  @command(c(new Command().requiredOption('--context <value>', 'Semantic release report')))
  @schema(c(VCS_OPTIONS))
  @hook('vcs-commit', execute())
  commitChanges({ context }: z.infer<typeof VCS_OPTIONS>): void {
    this.validateVCS();
    const releaseContext = deserializeContext(context);
    const { template } = this.config!;
    const cwd = template ? this.cwd : __dirname;
    const commitMessage = this.renderService.render(template ?? './release-commit-msg.hbs', releaseContext, { cwd });
    this.vcs.commit(commitMessage);
  }

  @command(c(new Command().requiredOption('--context <value>', 'Semantic release report')))
  @schema(c(VCS_OPTIONS))
  @hook('vcs-tag', execute())
  createTags({ context }: z.infer<typeof VCS_OPTIONS>): void {
    this.validateVCS();
    const { releasedPackages, releasedVersions } = deserializeContext(context);
    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name);
      this.vcs.createTag(`${pkg.name}@${newVersion}`);
      this.logger.info(`TAG      ${pkg.name}@${newVersion}`);
    }
  }

  @command(c(new Command().requiredOption('--context <value>', 'Semantic release report')))
  @schema(c(VCS_OPTIONS))
  @hook('vcs-push', execute())
  pushChanges({ context }: z.infer<typeof VCS_OPTIONS>): void {
    this.validateVCS();
    const { releasedPackages } = deserializeContext(context);
    this.vcs.push(releasedPackages.length > 0);
    this.logger.info(`PUSH     HEAD${releasedPackages.length > 0 ? ` and ${releasedPackages.length} tag(s)` : ''}`);
  }

  private validateVCS(): void {
    if (!this.vcs.isWorkingTreeClean()) {
      throw new DirtyWorkingTreeException();
    }
  }
}

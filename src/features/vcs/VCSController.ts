import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { z } from 'zod';
import { inject, register } from 'ts-ioc-container';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService.js';
import { pluginsConfigService } from '../../services/PluginsConfigService.js';
import { globalConfig } from '../../domain/GlobalConfig.js';
import { VSCService, VSCServiceKey } from './services/VSCService.js';
import { CONFIG_KEY, PLUGIN_CONFIG_SCHEMA } from './VCSConfig.js';
import { action, execute, onDefault } from '../../cli/index.js';
import { deserializeContext } from '../../domain/ReleaseControllerContext.js';
import { isDryRun, parseOptions, STEP_OPTIONS, stepCommand, type StepOptions } from '../../utils/cli.js';
import { validate } from '../../utils/zod.js';
import { commandArgs } from '../../utils/ts-ioc-container.js';

export const VCS_OPTIONS = STEP_OPTIONS.extend({
  template: z.string().trim().optional(),
});

const vcsCommand = () => stepCommand().option('--template <path>', 'Handlebars template for the release commit message');

@register('vcs')
export class VCSController {
  constructor(
    @inject(pluginsConfigService(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA>,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(VSCServiceKey) private readonly vcs: VSCService,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
    @inject(ILoggerKey.args('vcs')) private readonly logger: ILogger,
  ) {}

  // Declaration order is the execution order of the default action:
  // `monorepo-semantic-release vcs` commits, tags, then pushes.
  @onDefault(execute())
  @action('commit', execute())
  commitChanges(@inject(commandArgs, parseOptions(vcsCommand()), validate(VCS_OPTIONS)) options: z.infer<typeof VCS_OPTIONS>): void {
    // No working-tree-clean precondition here: this step's job is to commit
    // the changes the package-json/package-manager/changelog steps just made.
    // The clean-tree check that matters — catching pre-existing unrelated
    // changes before the pipeline touches anything — lives in `report`.
    const releaseContext = deserializeContext(options.context);
    const template = options.template ?? this.config.template;
    const cwd = template ? this.cwd : import.meta.dirname;
    const commitMessage = this.renderService.render(template ?? './release-commit-msg.hbs', releaseContext, { cwd });

    if (isDryRun(options, this.config)) {
      this.logger.info(`SKIP     COMMIT (dry-run)\n${commitMessage}`);
      return;
    }

    this.vcs.commit(commitMessage);
    this.logger.info('COMMIT   release commit created');
  }

  @onDefault(execute())
  @action('tag', execute())
  createTags(@inject(commandArgs, parseOptions(stepCommand()), validate(STEP_OPTIONS)) options: StepOptions): void {
    const { releasedPackages, releasedVersions } = deserializeContext(options.context);
    const dryRun = isDryRun(options, this.config);

    for (const pkg of releasedPackages) {
      const newVersion = releasedVersions.get(pkg.name);
      if (dryRun) {
        this.logger.info(`SKIP     TAG      ${pkg.name}@${newVersion} (dry-run)`);
        continue;
      }
      this.vcs.createTag(`${pkg.name}@${newVersion}`);
      this.logger.info(`TAG      ${pkg.name}@${newVersion}`);
    }
  }

  @onDefault(execute())
  @action('push', execute())
  pushChanges(@inject(commandArgs, parseOptions(stepCommand()), validate(STEP_OPTIONS)) options: StepOptions): void {
    const { releasedPackages } = deserializeContext(options.context);
    const tagSuffix = releasedPackages.length > 0 ? ` and ${releasedPackages.length} tag(s)` : '';

    if (isDryRun(options, this.config)) {
      this.logger.info(`SKIP     PUSH     HEAD${tagSuffix} (dry-run)`);
      return;
    }

    this.vcs.push(releasedPackages.length > 0);
    this.logger.info(`PUSH     HEAD${tagSuffix}`);
  }
}

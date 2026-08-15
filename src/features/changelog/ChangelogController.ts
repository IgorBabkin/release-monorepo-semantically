import { bindTo, inject, register } from 'ts-ioc-container';
import { globalConfig } from '../../domain/GlobalConfig.js';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService.js';
import { IFileSystemService, IFileSystemServiceKey } from '../../services/NodeFileSystemService.js';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger.js';
import { deserializeContext } from '../../domain/ReleaseControllerContext.js';
import path from 'node:path';
import { z } from 'zod';
import { action, command, execute, onDefault, schema } from '../../cli/index.js';
import { constant as c } from '../../utils/utils.js';
import { pluginsConfigService } from '../../services/PluginsConfigService.js';
import { CONFIG_KEY, PLUGIN_CONFIG_SCHEMA } from './ChangelogConfig.js';
import { isDryRun, STEP_OPTIONS, stepCommand } from '../../utils/cli.js';

export const CHANGELOG_OPTIONS = STEP_OPTIONS.extend({
  template: z.string().trim().optional(),
  changelogName: z.string().trim().optional(),
});

const changelogCommand = () =>
  stepCommand()
    .option('--template <path>', 'Handlebars template for changelog entries')
    .option('--changelog-name <value>', 'Changelog file name (default CHANGELOG.md)');

@register(bindTo('changelog'))
export class ChangelogController {
  constructor(
    @inject(pluginsConfigService(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA>,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(ILoggerKey.args('changelog')) private readonly logger: ILogger,
  ) {}

  @onDefault(execute())
  @command(c(changelogCommand()))
  @schema(c(CHANGELOG_OPTIONS))
  @action('generate', execute())
  generateChangelog(options: z.infer<typeof CHANGELOG_OPTIONS>): void {
    const releaseContext = deserializeContext(options.context);
    const { releasedPackages } = releaseContext;
    const template = options.template ?? this.config.template;
    const changelogName = options.changelogName ?? this.config.changelogName;
    const dryRun = isDryRun(options, this.config);

    for (const pkg of releasedPackages) {
      const changelogFile = path.resolve(pkg.dirname, changelogName);
      const existing = this.fs.fileExists(changelogFile) ? this.fs.readFile(changelogFile) : '';
      const cwd = template ? this.cwd : import.meta.dirname;
      const content = this.renderService.render(template ?? './changelog.hbs', { ...releaseContext, pkg, existing }, { cwd });

      if (dryRun) {
        this.logger.info(`SKIP     WRITE    ${pkg.name} ${changelogName} (dry-run)`);
        continue;
      }

      this.fs.writeFile(changelogFile, content);
      this.logger.info(`WRITE    ${pkg.name} ${changelogName}`);
    }
  }
}

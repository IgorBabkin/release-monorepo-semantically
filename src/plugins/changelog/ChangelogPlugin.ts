import path from 'node:path';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { onPackageReleasedHook, PackageReleasedPluginContext, ReleasePlugin, ReleasePluginKey } from '../ReleasePlugin';
import { IFileSystemService, IFileSystemServiceKey } from '../../services/NodeFileSystemService';
import { z } from 'zod';
import { bindTo, inject, register } from 'ts-ioc-container';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService';
import { execute } from '../../utils/hooks';
import { pluginsConfigService } from '../../services/PluginsConfigService';
import { globalConfig } from '../../models/GlobalConfig';
import { PLUGIN_CONFIG_SCHEMA } from './ChangelogPluginConfig';

@register(bindTo(ReleasePluginKey))
export class ChangelogPlugin implements ReleasePlugin {
  constructor(
    @inject(pluginsConfigService('changelog', PLUGIN_CONFIG_SCHEMA)) private readonly config: z.infer<typeof PLUGIN_CONFIG_SCHEMA> | null,
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(ILoggerKey.args('ChangelogPlugin')) private readonly logger: ILogger,
  ) {}

  get priority(): number {
    return this.config?.priority ?? 0;
  }

  get disabled(): boolean {
    return this.config?.disabled ?? false;
  }

  @onPackageReleasedHook(execute())
  generateChangelog(context: PackageReleasedPluginContext): void {
    const { template, changelogName = 'CHANGELOG.md', dryRun } = this.config!;
    const { pkg } = context;

    if (dryRun) {
      this.logger.info(`SKIP     ${pkg.name} ${changelogName} (dry-run)`);
      return;
    }

    const changelogFile = path.resolve(pkg.dirname, changelogName);
    const existing = this.fs.fileExists(changelogFile) ? this.fs.readFile(path.resolve(pkg.dirname, changelogName)) : '';
    const cwd = template ? this.cwd : __dirname;
    const content = this.renderService.render(template ?? './changelog.hbs', { ...context, existing }, { cwd });
    this.fs.writeFile(changelogFile, content);
    this.logger.info(`WRITE    ${pkg.name} ${changelogName}`);
  }
}

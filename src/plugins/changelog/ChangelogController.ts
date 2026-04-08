import { bindTo, hook, inject, register } from 'ts-ioc-container';
import { globalConfig } from '../../models/GlobalConfig';
import { IRenderService, IRenderServiceKey } from '../../services/HandlebarsRenderService';
import { IFileSystemService, IFileSystemServiceKey } from '../../services/NodeFileSystemService';
import { ILogger, ILoggerKey } from '../../services/ConsoleLogger';
import { execute } from '../../utils/hooks';
import { deserializeContext } from '../../models/ReleaseControllerContext';
import path from 'node:path';
import { Command } from 'commander';
import { z } from 'zod';
import { command, schema } from 'ib-commander';
import { constant as c } from '../../utils/utils';

export const CHANGELOG_OPTIONS = z.object({
  template: z
    .string()
    .trim()
    .regex(/^[^/\s]+\/[^/\s]+$/)
    .optional(),
  changelogName: z.string().trim().optional(),
  context: z.string(),
});

@register(bindTo('changelog'))
export class ChangelogController {
  constructor(
    @inject(globalConfig('cwd')) private readonly cwd: string,
    @inject(IRenderServiceKey) private readonly renderService: IRenderService,
    @inject(IFileSystemServiceKey) private readonly fs: IFileSystemService,
    @inject(ILoggerKey.args('ChangelogPlugin')) private readonly logger: ILogger,
  ) {}

  @command(c(new Command().option('--changelogName <value>', 'Changelog file name').requiredOption('--context <value>', 'Semantic release report')))
  @schema(c(CHANGELOG_OPTIONS))
  @hook('generate', execute())
  generateChangelog({ context, template, changelogName = 'CHANGELOG.md' }: z.infer<typeof CHANGELOG_OPTIONS>): void {
    const releaseContext = deserializeContext(context);
    const { releasedPackages } = releaseContext;

    for (const pkg of releasedPackages) {
      const changelogFile = path.resolve(pkg.dirname, changelogName);
      const existing = this.fs.fileExists(changelogFile) ? this.fs.readFile(path.resolve(pkg.dirname, changelogName)) : '';
      const cwd = template ? this.cwd : __dirname;
      const content = this.renderService.render(template ?? './changelog.hbs', { ...releaseContext, existing }, { cwd });
      this.fs.writeFile(changelogFile, content);
      this.logger.info(`WRITE    ${pkg.name} ${changelogName}`);
    }
  }
}

import { Controller } from './Controller';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';
import { ChangelogView } from './services/ChangelogView';
import { HandlebarsRenderService } from './services/HandlebarsRenderService';
import { ReleaseCommitView } from './services/ReleaseCommitView';
import { PackageManager } from './services/PackageManager';
import { ConsoleLogger } from './services/ConsoleLogger';
import { ExceptionHandler } from './services/ExceptionHandler';
import path from 'node:path';
import { ChangelogPlugin } from './plugins/ChangelogPlugin';
import { GitPlugin } from './plugins/GitPlugin';
import { NpmPlugin } from './plugins/NpmPlugin';
import { PackageJsonPlugin } from './plugins/PackageJsonPlugin';
import { GithubPlugin } from './plugins/GithubPlugin';
import { GithubService } from './services/GithubService';
import { GithubReleaseView } from './services/GithubReleaseView';
import { ReleaseConfigService } from './services/ReleaseConfigService';
import { CliOptionsService } from './services/CliOptionsService';

export function runCli(cwd = process.cwd(), cliArgs = process.argv.slice(2)): number {
  const cliOptionsService = new CliOptionsService();
  const cliOptions = cliOptionsService.parse(cliArgs);
  const fsService = new NodeFileSystemService();
  const vcsService = new GitService();
  const exceptionHandler = new ExceptionHandler();
  const releaseConfigService = new ReleaseConfigService(fsService);

  if (cliOptions.help) {
    return 0;
  }

  try {
    const logger = new ConsoleLogger('Release');
    const templateOverrides = releaseConfigService.resolveTemplateOverrides(cwd, cliOptions);
    const renderService = new HandlebarsRenderService(cwd, path.resolve(__dirname, '..'));
    const changelogView = new ChangelogView(templateOverrides.changelogTemplate, renderService);
    const releaseCommitView = new ReleaseCommitView(templateOverrides.releaseCommitTemplate, renderService);
    const githubReleaseView = new GithubReleaseView(undefined, renderService);
    const packageManager = new PackageManager();
    const githubService = new GithubService();
    const controller = new Controller(
      [
        new PackageJsonPlugin(fsService, logger),
        new ChangelogPlugin('CHANGELOG.md', changelogView, fsService, logger),
        new GitPlugin(vcsService, releaseCommitView, logger),
        GithubPlugin.createFromEnv(githubService, logger, githubReleaseView),
        new NpmPlugin(packageManager, logger),
      ],
      fsService,
      vcsService,
      logger,
    );

    controller.discoverPackages(cwd);
    controller.release({ dryRun: cliOptions.dryRun, noPush: cliOptions.noPush, noPublish: cliOptions.noPublish });

    return 0;
  } catch (error) {
    exceptionHandler.handle(error);
    return 1;
  }
}

export default runCli;

if (require.main === module) {
  process.exit(runCli());
}

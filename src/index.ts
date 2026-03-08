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
import { ReleasePlugin } from './plugins/ReleasePlugin';
import { ReleasePluginConfig } from './models/ReleasePluginConfig';

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
    const packageManager = new PackageManager();
    const githubService = new GithubService();
    const buildPlugin = (pluginConfig: ReleasePluginConfig): ReleasePlugin => {
      switch (pluginConfig.name) {
        case 'package-json':
          return new PackageJsonPlugin(fsService, logger, pluginConfig);
        case 'changelog':
          return new ChangelogPlugin(
            'CHANGELOG.md',
            new ChangelogView(pluginConfig.template ?? templateOverrides.changelogTemplate, renderService),
            fsService,
            logger,
            pluginConfig,
          );
        case 'git':
          return new GitPlugin(
            vcsService,
            new ReleaseCommitView(pluginConfig.template ?? templateOverrides.releaseCommitTemplate, renderService),
            logger,
            pluginConfig,
          );
        case 'github':
          return GithubPlugin.createFromEnv(githubService, logger, new GithubReleaseView(pluginConfig.template, renderService), pluginConfig);
        case 'npm':
          return new NpmPlugin(packageManager, logger, pluginConfig);
      }
    };
    const plugins = releaseConfigService.resolvePlugins(cwd).map(buildPlugin);
    const controller = new Controller(plugins, fsService, vcsService, logger);

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

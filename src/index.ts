import { MonorepoController } from './MonorepoController';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';
import { ChangelogView, DEFAULT_CHANGELOG_TEMPLATE } from './services/ChangelogView';
import { HandlebarsRenderService } from './services/HandlebarsRenderService';
import { DEFAULT_RELEASE_COMMIT_TEMPLATE, ReleaseCommitView } from './services/ReleaseCommitView';
import { PackageManager } from './services/PackageManager';
import { ConsoleLogger } from './services/ConsoleLogger';
import { ErrorHandler } from './services/ErrorHandler';
import { Command } from 'commander';
import path from 'node:path';
import { CliOptions, TemplateOverrides } from './CliOptions';
import { ChangelogPlugin } from './plugins/ChangelogPlugin';
import { GitPlugin } from './plugins/GitPlugin';
import { NpmPlugin } from './plugins/NpmPlugin';
import { PackageJsonPlugin } from './plugins/PackageJsonPlugin';
import { GithubPlugin } from './plugins/GithubPlugin';
import { GithubService } from './services/GithubService';

interface PackageJsonWithTemplates {
  releaseTemplates?: TemplateOverrides;
}

type ResolvedTemplateOverrides = Required<TemplateOverrides>;

function createProgram(): Command {
  return new Command()
    .name('monorepo-semantic-release')
    .allowExcessArguments(false)
    .helpOption('-h, --help', 'Show this help message')
    .option('--dry-run', 'Preview release changes without mutating files, commits, or tags')
    .option('--no-push', 'Skip pushing the release commit and tags to the Git remote')
    .option('--no-publish', 'Skip publishing bumped packages')
    .option('--changelog-template <path>', `Override changelog template (default: ${DEFAULT_CHANGELOG_TEMPLATE})`)
    .option('--release-commit-template <path>', `Override release commit template (default: ${DEFAULT_RELEASE_COMMIT_TEMPLATE})`);
}

export function parseCliOptions(args: string[]): CliOptions {
  const program = createProgram();

  try {
    program.exitOverride();
    program.parse(['node', 'monorepo-semantic-release', ...args], { from: 'node' });
  } catch (error) {
    const commanderError = error as { code?: string };
    if (commanderError.code === 'commander.helpDisplayed') {
      return {
        help: true,
        dryRun: false,
        noPush: false,
        noPublish: false,
      };
    }
    throw error;
  }

  const options = program.opts<CliOptions>();
  const commanderOptions = options as CliOptions & { push?: boolean; publish?: boolean };

  return {
    help: false,
    dryRun: options.dryRun ?? false,
    noPush: commanderOptions.push === false,
    noPublish: commanderOptions.publish === false,
    changelogTemplate: options.changelogTemplate,
    releaseCommitTemplate: options.releaseCommitTemplate,
  };
}

function resolveTemplateOverrides(cwd: string, fsService: NodeFileSystemService, cliOptions: CliOptions): ResolvedTemplateOverrides {
  const packageJson = fsService.readJson<PackageJsonWithTemplates>(path.resolve(cwd, 'package.json'));
  const packageTemplates = packageJson.releaseTemplates ?? {};

  return {
    releaseCommitTemplate: cliOptions.releaseCommitTemplate ?? packageTemplates.releaseCommitTemplate ?? DEFAULT_RELEASE_COMMIT_TEMPLATE,
    changelogTemplate: cliOptions.changelogTemplate ?? packageTemplates.changelogTemplate ?? DEFAULT_CHANGELOG_TEMPLATE,
  };
}

export function runCli(cwd = process.cwd(), cliArgs = process.argv.slice(2)): number {
  const cliOptions = parseCliOptions(cliArgs);
  const fsService = new NodeFileSystemService();
  const vcsService = new GitService();
  const errorHandler = new ErrorHandler();

  if (cliOptions.help) {
    return 0;
  }

  try {
    const logger = new ConsoleLogger('Release');
    const templateOverrides = resolveTemplateOverrides(cwd, fsService, cliOptions);
    const renderService = new HandlebarsRenderService(cwd, path.resolve(__dirname, '..'));
    const changelogView = new ChangelogView(templateOverrides.changelogTemplate, renderService);
    const releaseCommitView = new ReleaseCommitView(templateOverrides.releaseCommitTemplate, renderService);
    const packageManager = new PackageManager();
    const githubService = new GithubService();
    const githubConfig = {
      isGithubActions: process.env.GITHUB_ACTIONS === 'true',
      repository: process.env.GITHUB_REPOSITORY,
      token: process.env.GITHUB_TOKEN,
    };
    const controller = new MonorepoController(
      [
        new PackageJsonPlugin(fsService, logger),
        new ChangelogPlugin('CHANGELOG.md', changelogView, fsService, logger),
        new GitPlugin(vcsService, releaseCommitView, logger),
        new GithubPlugin(githubService, logger, githubConfig),
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
    errorHandler.handle(error);
    return 1;
  }
}

export default runCli;

if (require.main === module) {
  process.exit(runCli());
}

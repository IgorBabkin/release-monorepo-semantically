import { MonorepoController } from './MonorepoController';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';
import { ChangelogView } from './services/ChangelogView';
import { HandlebarsRenderService } from './services/HandlebarsRenderService';
import { ReleaseCommitView } from './services/ReleaseCommitView';
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

const DEFAULT_CHANGELOG_TEMPLATE = 'templates/changelog.hbs';
const DEFAULT_RELEASE_COMMIT_TEMPLATE = 'templates/release-commit-msg.hbs';

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
        push: true,
        publish: true,
      };
    }
    throw error;
  }

  const options = program.opts<CliOptions>();

  return {
    help: false,
    dryRun: options.dryRun ?? false,
    push: options.push ?? true,
    publish: options.publish ?? true,
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
    const templateOverrides = resolveTemplateOverrides(cwd, fsService, cliOptions);
    const renderService = new HandlebarsRenderService(cwd, path.resolve(__dirname, '..'));
    const changelogView = new ChangelogView(templateOverrides.changelogTemplate, renderService);
    const releaseCommitView = new ReleaseCommitView(templateOverrides.releaseCommitTemplate, renderService);
    const packageManager = new PackageManager();
    const controller = new MonorepoController(
      [
        new PackageJsonPlugin(fsService, new ConsoleLogger('PackageJsonPlugin')),
        new ChangelogPlugin('CHANGELOG.md', changelogView, fsService, new ConsoleLogger('ChangelogPlugin')),
        new NpmPlugin(packageManager, new ConsoleLogger('NpmPlugin')),
        new GitPlugin(vcsService, releaseCommitView, new ConsoleLogger('GitPlugin')),
      ],
      fsService,
      vcsService,
    );

    controller.discoverRootPackageJSON();
    controller.discoverPackages();
    controller.release({ dryRun: cliOptions.dryRun, push: cliOptions.push, publish: cliOptions.publish });

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

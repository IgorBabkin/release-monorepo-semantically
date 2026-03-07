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

const DEFAULT_CHANGELOG_TEMPLATE = 'templates/changelog.hbs';
const DEFAULT_RELEASE_COMMIT_TEMPLATE = 'templates/release-commit-msg.hbs';

interface CliOptions {
  help: boolean;
  dryRun: boolean;
  changelogTemplate?: string;
  releaseCommitTemplate?: string;
}

interface TemplateOverrides {
  changelogTemplate: string;
  releaseCommitTemplate: string;
}

interface PackageJsonWithTemplates {
  releaseTemplates?: {
    changelogTemplate?: string;
    releaseCommitTemplate?: string;
  };
}

function createProgram(): Command {
  return new Command()
    .name('monorepo-semantic-release')
    .allowExcessArguments(false)
    .helpOption('-h, --help', 'Show this help message')
    .option('--dry-run', 'Preview release changes without mutating files, commits, or tags')
    .option('--changelog-template <path>', `Override changelog template (default: ${DEFAULT_CHANGELOG_TEMPLATE})`)
    .option('--release-commit-template <path>', `Override release commit template (default: ${DEFAULT_RELEASE_COMMIT_TEMPLATE})`);
}

export function renderHelpText(): string {
  return createProgram().helpInformation();
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
      };
    }
    throw error;
  }

  const options = program.opts<{
    dryRun?: boolean;
    changelogTemplate?: string;
    releaseCommitTemplate?: string;
  }>();

  return {
    help: false,
    dryRun: options.dryRun ?? false,
    changelogTemplate: options.changelogTemplate,
    releaseCommitTemplate: options.releaseCommitTemplate,
  };
}

function resolveTemplateOverrides(cwd: string, fsService: NodeFileSystemService, cliOptions: CliOptions): TemplateOverrides {
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
  const vcs = new GitService();
  const errorHandler = new ErrorHandler();

  if (cliOptions.help) {
    console.log(renderHelpText());
    return 0;
  }

  try {
    const templateOverrides = resolveTemplateOverrides(cwd, fsService, cliOptions);
    const renderService = new HandlebarsRenderService(cwd, path.resolve(__dirname, '..'));
    const changelog = new ChangelogView(renderService, fsService, templateOverrides.changelogTemplate);
    const releaseCommit = new ReleaseCommitView(renderService, templateOverrides.releaseCommitTemplate);
    const packageManager = new PackageManager();
    const controller = new MonorepoController(fsService, vcs, changelog, releaseCommit, packageManager, new ConsoleLogger('Release'));

    controller.discoverRootPackageJSON();
    controller.discoverPackages();
    controller.release({ dryRun: cliOptions.dryRun });

    return 0;
  } catch (error) {
    errorHandler.handle(error);
    return 1;
  }
}

if (require.main === module) {
  process.exit(runCli());
}

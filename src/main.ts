import { MonorepoController } from './MonorepoController';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { GitService } from './services/GitService';
import { ChangelogView } from './services/ChangelogView';
import { HandlebarsRenderService } from './services/HandlebarsRenderService';
import { ReleaseCommitView } from './services/ReleaseCommitView';
import { PackageManager } from './services/PackageManager';
import { ConsoleLogger } from './services/ConsoleLogger';
import path from 'node:path';

const DEFAULT_CHANGELOG_TEMPLATE = 'templates/changelog.hbs';
const DEFAULT_RELEASE_COMMIT_TEMPLATE = 'templates/release-commit-msg.hbs';

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

function hasHelpFlag(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}

function hasDryRunFlag(args: string[]): boolean {
  return args.includes('--dry-run');
}

function renderHelpText(): string {
  return [
    'Usage: monorepo-semantic-release [options]',
    '',
    'Options:',
    '  -h, --help                              Show this help message',
    '  --dry-run                              Preview release changes without mutating files, commits, or tags',
    `  --changelog-template <path>             Override changelog template (default: ${DEFAULT_CHANGELOG_TEMPLATE})`,
    `  --release-commit-template <path>        Override release commit template (default: ${DEFAULT_RELEASE_COMMIT_TEMPLATE})`,
  ].join('\n');
}

function parseCliTemplateArg(args: string[], name: string): string | undefined {
  const prefixed = `--${name}=`;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === `--${name}` && args[index + 1] && !args[index + 1].startsWith('--')) {
      return args[index + 1];
    }
    if (arg.startsWith(prefixed)) {
      return arg.slice(prefixed.length);
    }
  }
  return undefined;
}

function resolveTemplateOverrides(cwd: string, fsService: NodeFileSystemService, args: string[]): TemplateOverrides {
  const packageJson = fsService.readJson<PackageJsonWithTemplates>(path.resolve(cwd, 'package.json'));
  const packageTemplates = packageJson.releaseTemplates ?? {};

  return {
    releaseCommitTemplate: parseCliTemplateArg(args, 'release-commit-template') ?? packageTemplates.releaseCommitTemplate ?? DEFAULT_RELEASE_COMMIT_TEMPLATE,
    changelogTemplate: parseCliTemplateArg(args, 'changelog-template') ?? packageTemplates.changelogTemplate ?? DEFAULT_CHANGELOG_TEMPLATE,
  };
}

export function runCli(cwd = process.cwd(), cliArgs = process.argv.slice(2)): number {
  if (hasHelpFlag(cliArgs)) {
    console.log(renderHelpText());
    return 0;
  }

  try {
    const fsService = new NodeFileSystemService();
    const templateOverrides = resolveTemplateOverrides(cwd, fsService, cliArgs);
    const vcs = new GitService();
    const renderService = new HandlebarsRenderService(cwd, path.resolve(__dirname, '..'));
    const changelog = new ChangelogView(renderService, fsService, templateOverrides.changelogTemplate);
    const releaseCommit = new ReleaseCommitView(renderService, templateOverrides.releaseCommitTemplate);
    const packageManager = new PackageManager();
    const controller = new MonorepoController(fsService, vcs, changelog, releaseCommit, packageManager, new ConsoleLogger('Release'));
    const dryRun = hasDryRunFlag(cliArgs);

    controller.discoverRootPackageJSON();
    controller.discoverPackages();
    controller.release({ dryRun });

    return 0;
  } catch (error) {
    console.error(error);
    return 1;
  }
}

if (require.main === module) {
  process.exit(runCli());
}

import { Command } from 'commander';
import { CliOptions } from '../CliOptions';
import { DEFAULT_CHANGELOG_TEMPLATE } from './ChangelogView';
import { DEFAULT_RELEASE_COMMIT_TEMPLATE } from './ReleaseCommitView';

export class CliOptionsService {
  parse(args: string[]): CliOptions {
    const program = this.createProgram();

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

  private createProgram(): Command {
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
}

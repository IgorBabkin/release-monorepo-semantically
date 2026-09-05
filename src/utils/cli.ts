import { Command, type OptionValues } from 'commander';
import { z } from 'zod';

/**
 * Options every context-consuming step accepts. `--context` is the serialized
 * report produced by the `report` command; `--dry-run` previews the step and
 * always wins over the `dryRun` value in configuration.
 */
export const STEP_OPTIONS = z.object({
  context: z.string(),
  dryRun: z.boolean().default(false),
});

export type StepOptions = z.infer<typeof STEP_OPTIONS>;

export function stepCommand(): Command {
  return (
    new Command()
      .requiredOption('--context <value>', 'Release context JSON produced by the `report` command')
      .option('--dry-run', 'Preview this step without writing anything')
      // A controller's default action can fan out into several methods (e.g.
      // `vcs` runs commit, then tag, then push) that all parse the same raw
      // argv against their own Command. A flag meant for a sibling action
      // (like `--template` on `vcs commit`) would otherwise make every other
      // action in the chain fail with "unknown option". Since an unrecognized
      // option's value can't be paired with it, commander also drops that
      // value into positional args, so excess arguments have to be tolerated
      // too, or a step with zero declared positionals rejects it outright.
      .allowUnknownOption()
      .allowExcessArguments()
  );
}

export const isDryRun = (options: { dryRun: boolean }, config: { dryRun: boolean }): boolean => options.dryRun || config.dryRun;

/**
 * Mapper that feeds raw process arguments to a commander `Command` and returns
 * the parsed options. Everything from the first flag onwards belongs to this
 * action — what precedes it is the controller and action name.
 */
export const parseOptions =
  (command: Command) =>
  (rawArgs: string[]): OptionValues => {
    const firstFlag = rawArgs.findIndex((arg) => arg.startsWith('-'));
    command.parse(firstFlag >= 0 ? ['node', 'script', ...rawArgs.slice(firstFlag)] : ['node', 'script']);
    return command.opts();
  };

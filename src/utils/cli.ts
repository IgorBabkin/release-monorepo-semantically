import { Command } from 'commander';
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
  return new Command()
    .requiredOption('--context <value>', 'Release context JSON produced by the `report` command')
    .option('--dry-run', 'Preview this step without writing anything');
}

export const isDryRun = (options: { dryRun: boolean }, config: { dryRun: boolean }): boolean => options.dryRun || config.dryRun;

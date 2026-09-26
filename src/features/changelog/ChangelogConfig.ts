import { z } from 'zod';

export const CONFIG_KEY = 'changelog';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  dryRun: z.boolean().default(false).describe('Always preview this step (same as passing --dry-run): no file, git, or registry mutation.'),
  template: z.string().optional().describe('Path (relative to the working directory) to a Handlebars template for each changelog entry.'),
  changelogName: z.string().trim().default('CHANGELOG.md').describe('Changelog file name inside each released package directory.'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;

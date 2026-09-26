import { z } from 'zod';

export const CONFIG_KEY = 'package-json';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  dryRun: z.boolean().default(false).describe('Always preview this step (same as passing --dry-run): no file, git, or registry mutation.'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;

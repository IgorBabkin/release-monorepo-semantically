import { z } from 'zod';

export const CONFIG_KEY = 'changelog';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  dryRun: z.boolean().default(false),
  template: z.string().optional(),
  changelogName: z.string().trim().default('CHANGELOG.md'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;

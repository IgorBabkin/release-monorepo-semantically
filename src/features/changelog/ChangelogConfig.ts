import { z } from 'zod';

export const CONFIG_KEY = 'changelog';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  disabled: z.boolean().optional(),
  dryRun: z.boolean().default(false),
  template: z.string().optional(),
  changelogName: z.string().trim().default('CHANGELOG.md'),
  priority: z.number().optional(),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;

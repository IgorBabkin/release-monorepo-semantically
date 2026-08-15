import { z } from 'zod';

export const CONFIG_KEY = 'package-json';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  dryRun: z.boolean().default(false),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;

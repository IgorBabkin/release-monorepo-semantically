import { scope } from 'ts-ioc-container';
import { IPluginsConfigServiceKey } from '../../services/PluginsConfigService.js';
import { z } from 'zod';

export const CONFIG_KEY = 'release-notes';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  // Optional in config because CI normally supplies both through the standard
  // GitHub Actions environment; resolved and validated at use time.
  repository: z
    .string()
    .trim()
    .regex(/^[^/\s]+\/[^/\s]+$/)
    .optional(),
  token: z.string().trim().min(1).optional(),
  dryRun: z.boolean().default(false),
  template: z.string().optional(),
  kind: z.enum(['github']).default('github'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;
export const whenConfig = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const config = IPluginsConfigServiceKey.resolve(c).getConfig(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA);
    return prev && config[key] === value;
  });

import { scope } from 'ts-ioc-container';
import { IPluginsConfigServiceKey } from '../../services/PluginsConfigService';
import { z } from 'zod';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  repository: z
    .string()
    .trim()
    .regex(/^[^/\s]+\/[^/\s]+$/),
  token: z.string().trim().min(1),
  disabled: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  template: z.string().optional(),
  priority: z.number().optional(),
  kind: z.enum(['git']).default('git'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;
export const whenConfig = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const config = IPluginsConfigServiceKey.resolve(c).getConfig('vcs', PLUGIN_CONFIG_SCHEMA);
    return prev && config !== null && config[key] === value;
  });

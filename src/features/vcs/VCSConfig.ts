import { scope } from 'ts-ioc-container';
import { IPluginsConfigServiceKey } from '../../services/PluginsConfigService.js';
import { z } from 'zod';

export const CONFIG_KEY = 'vcs';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  disabled: z.boolean().optional(),
  dryRun: z.boolean().default(false),
  template: z.string().optional(),
  priority: z.number().optional(),
  kind: z.enum(['git']).default('git'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;
export const whenConfig = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const config = IPluginsConfigServiceKey.resolve(c).getConfig(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA);
    return prev && config[key] === value;
  });

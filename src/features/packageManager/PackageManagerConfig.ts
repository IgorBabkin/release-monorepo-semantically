import { scope } from 'ts-ioc-container';
import { IPluginsConfigServiceKey } from '../../services/PluginsConfigService.js';
import { z } from 'zod';

export const CONFIG_KEY = 'package-manager';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  disabled: z.boolean().optional(),
  dryRun: z.boolean().default(false),
  priority: z.number().optional(),
  kind: z.enum(['npm', 'pnpm', 'yarn']).default('pnpm'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;
export const whenPackageManagerConfigEqual = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const config = IPluginsConfigServiceKey.resolve(c).getConfig(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA);
    return prev && config[key] === value;
  });

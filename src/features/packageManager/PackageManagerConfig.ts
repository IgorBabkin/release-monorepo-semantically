import { scope } from 'ts-ioc-container';
import { IPluginsConfigServiceKey } from '../../services/PluginsConfigService';
import { z } from 'zod';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  disabled: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  priority: z.number().optional(),
  kind: z.enum(['npm', 'pnpm', 'yarn']).default('pnpm'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;
export const whenPackageManagerConfigEqual = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const configService = IPluginsConfigServiceKey.resolve(c);
    const config = configService.getConfig('release-notes', PLUGIN_CONFIG_SCHEMA);
    return prev && config !== null && config[key] === value;
  });

import { scope } from 'ts-ioc-container';
import { IPluginsConfigServiceKey } from '../../services/PluginsConfigService.js';
import { z } from 'zod';

export const CONFIG_KEY = 'package-manager';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  dryRun: z.boolean().default(false).describe('Always preview this step (same as passing --dry-run): no file, git, or registry mutation.'),
  kind: z.enum(['npm', 'pnpm', 'yarn']).default('pnpm').describe('Package manager used to refresh the lockfile and publish.'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;
export const whenPackageManagerConfigEqual = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const config = IPluginsConfigServiceKey.resolve(c).getConfig(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA);
    return prev && config[key] === value;
  });

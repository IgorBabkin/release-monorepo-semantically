import { scope } from 'ts-ioc-container';
import { IPluginsConfigServiceKey } from '../../services/PluginsConfigService.js';
import { z } from 'zod';

export const CONFIG_KEY = 'vcs';

export const PLUGIN_CONFIG_SCHEMA = z.object({
  dryRun: z.boolean().default(false).describe('Always preview this step (same as passing --dry-run): no file, git, or registry mutation.'),
  template: z.string().optional().describe('Path (relative to the working directory) to a Handlebars template for the release commit message.'),
  kind: z.enum(['git']).default('git').describe('Version control system.'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;
export const whenConfig = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const config = IPluginsConfigServiceKey.resolve(c).getConfig(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA);
    return prev && config[key] === value;
  });

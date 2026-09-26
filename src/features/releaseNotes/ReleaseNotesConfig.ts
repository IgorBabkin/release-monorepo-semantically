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
    .optional()
    .describe('GitHub repository as owner/name. Falls back to the GITHUB_REPOSITORY environment variable.'),
  token: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('GitHub token. Falls back to the GITHUB_TOKEN environment variable; prefer the env var over committing a token.'),
  dryRun: z.boolean().default(false).describe('Always preview this step (same as passing --dry-run): no file, git, or registry mutation.'),
  template: z.string().optional().describe('Path (relative to the working directory) to a Handlebars template for the release notes body.'),
  kind: z.enum(['github']).default('github').describe('Release notes provider.'),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;
export const whenConfig = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) =>
  scope((c, prev = true) => {
    const config = IPluginsConfigServiceKey.resolve(c).getConfig(CONFIG_KEY, PLUGIN_CONFIG_SCHEMA);
    return prev && config[key] === value;
  });

import { z } from 'zod';
import { DEFAULT_MAJOR_MATCHERS, DEFAULT_MINOR_MATCHERS, DEFAULT_PATCH_MATCHERS } from '../../domain/BumpMatcher.js';

export const CONFIG_KEY = 'report';

const BUMP_MATCHER_SCHEMA = z.object({
  type: z.string().optional(),
  scope: z.string().optional(),
  breaking: z.boolean().optional(),
  packages: z.union([z.literal('*'), z.array(z.string())]).optional(),
});

export const PLUGIN_CONFIG_SCHEMA = z.object({
  bumps: z
    .object({
      major: z.array(BUMP_MATCHER_SCHEMA).default(DEFAULT_MAJOR_MATCHERS),
      minor: z.array(BUMP_MATCHER_SCHEMA).default(DEFAULT_MINOR_MATCHERS),
      patch: z.array(BUMP_MATCHER_SCHEMA).default(DEFAULT_PATCH_MATCHERS),
    })
    .default({ major: DEFAULT_MAJOR_MATCHERS, minor: DEFAULT_MINOR_MATCHERS, patch: DEFAULT_PATCH_MATCHERS }),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;

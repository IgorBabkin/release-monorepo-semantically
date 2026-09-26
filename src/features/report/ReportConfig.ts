import { z } from 'zod';
import { DEFAULT_MAJOR_MATCHERS, DEFAULT_MINOR_MATCHERS, DEFAULT_PATCH_MATCHERS } from '../../domain/ConventionalCommit.js';

export const CONFIG_KEY = 'report';

const BUMP_MATCHER_SCHEMA = z
  .object({
    type: z.string().optional().describe('Conventional-commit type (feat, fix, docs, ...). Omitted: any type.'),
    scope: z.string().optional().describe('Literal scope, or "<package>" meaning "equals the name of the package being considered". Omitted: any scope.'),
    breaking: z.boolean().optional().describe('true matches "!" or a BREAKING CHANGE body, false matches its absence. Omitted: not considered.'),
    packages: z
      .union([z.literal('*'), z.array(z.string())])
      .optional()
      .describe('Packages a match releases: "*" for every public package, or a list of names. Ignored when scope is "<package>".'),
  })
  .describe('A commit matching every given field triggers the bump level this matcher is listed under.');

export const PLUGIN_CONFIG_SCHEMA = z.object({
  bumps: z
    .object({
      major: z.array(BUMP_MATCHER_SCHEMA).default(DEFAULT_MAJOR_MATCHERS),
      minor: z.array(BUMP_MATCHER_SCHEMA).default(DEFAULT_MINOR_MATCHERS),
      patch: z.array(BUMP_MATCHER_SCHEMA).default(DEFAULT_PATCH_MATCHERS),
    })
    .default({ major: DEFAULT_MAJOR_MATCHERS, minor: DEFAULT_MINOR_MATCHERS, patch: DEFAULT_PATCH_MATCHERS })
    .describe("Matchers per bump level. A configured level replaces that level's defaults entirely (no merging); unconfigured levels keep their defaults."),
});
export type PluginConfig = z.infer<typeof PLUGIN_CONFIG_SCHEMA>;

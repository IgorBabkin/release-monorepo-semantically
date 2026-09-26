import { z } from 'zod';
import * as changelog from '../features/changelog/ChangelogConfig.js';
import * as packageJson from '../features/packageJson/PackageJsonConfig.js';
import * as packageManager from '../features/packageManager/PackageManagerConfig.js';
import * as releaseNotes from '../features/releaseNotes/ReleaseNotesConfig.js';
import * as report from '../features/report/ReportConfig.js';
import * as vcs from '../features/vcs/VCSConfig.js';

/**
 * The whole `.release.json` file (or `release` section of the root
 * package.json): one optional section per step, keyed by that step's
 * CONFIG_KEY. Built from the same zod schemas the steps validate with, so the
 * published JSON Schema can't drift from what the CLI accepts.
 */
export const RELEASE_CONFIG_SCHEMA = z.object({
  $schema: z.string().optional(),
  [report.CONFIG_KEY]: report.PLUGIN_CONFIG_SCHEMA.optional(),
  [packageJson.CONFIG_KEY]: packageJson.PLUGIN_CONFIG_SCHEMA.optional(),
  [packageManager.CONFIG_KEY]: packageManager.PLUGIN_CONFIG_SCHEMA.optional(),
  [changelog.CONFIG_KEY]: changelog.PLUGIN_CONFIG_SCHEMA.optional(),
  [vcs.CONFIG_KEY]: vcs.PLUGIN_CONFIG_SCHEMA.optional(),
  [releaseNotes.CONFIG_KEY]: releaseNotes.PLUGIN_CONFIG_SCHEMA.optional(),
});

export function releaseConfigJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(RELEASE_CONFIG_SCHEMA, { io: 'input', target: 'draft-7' }),
    title: 'release-monorepo-semantically configuration',
    description:
      'Contents of .release.json, or the "release" section of the workspace root package.json. Each key configures one step; CLI flags win over both.',
  };
}

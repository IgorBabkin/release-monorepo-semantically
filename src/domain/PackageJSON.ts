import { z } from 'zod';

export interface PackageJSON {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  // Read-only as far as a release is concerned: a peer range states which
  // versions a consumer may pair the package with, so it must survive a
  // dependency bump untouched.
  peerDependencies?: Record<string, string>;
  workspaces?: string[]; // global workspaces field for monorepos
}

/** The workspace root declares its packages here; the `report` step has nothing to release without it. */
export type RootPackageJSON = PackageJSON & { workspaces: string[] };

// `bumpVersion` reads a version as three numbers, so anything else — a
// prerelease tag, a range, a placeholder — silently produces `NaN` in the
// released version instead of failing.
const SEMVER = /^\d+\.\d+\.\d+$/;

const DEPENDENCY_BLOCK = z.record(z.string().min(1), z.string().min(1, 'must be a version specifier'));

/**
 * What a released package's manifest has to declare. The schemas validate
 * only: callers keep the object as it was parsed, so a manifest that is
 * written back keeps its own field order and every field this tool does not
 * model (`scripts`, `exports`, `publishConfig`, ...).
 */
export const PACKAGE_JSON_SCHEMA = z.object({
  name: z.string({ error: 'is required' }).min(1, 'is required'),
  version: z.string({ error: 'is required' }).regex(SEMVER, 'must be a semantic version (major.minor.patch)'),
  private: z.boolean().optional(),
  dependencies: DEPENDENCY_BLOCK.optional(),
  devDependencies: DEPENDENCY_BLOCK.optional(),
  peerDependencies: DEPENDENCY_BLOCK.optional(),
});

export const ROOT_PACKAGE_JSON_SCHEMA = z.object({
  workspaces: z
    .array(z.string().min(1, 'must be a workspace glob'), { error: 'is required: list the globs the monorepo packages live under, e.g. ["packages/*"]' })
    .min(1, 'must list at least one workspace glob'),
});

/** `name: is required, version: must be a semantic version (major.minor.patch)` */
export function formatValidationIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`).join(', ');
}

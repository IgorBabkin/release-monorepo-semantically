import { ConventionalCommit } from './ConventionalCommit.js';
import { SemVerBumpType } from './SemVerBumpType.js';

// Reserved scope token meaning "equals the name of the package being considered".
export const PACKAGE_TOKEN = '<package>';

export interface BumpMatcher {
  type?: string;
  scope?: string;
  breaking?: boolean;
  packages?: '*' | string[];
}

export interface BumpMatchers {
  major: BumpMatcher[];
  minor: BumpMatcher[];
  patch: BumpMatcher[];
}

export const DEFAULT_MAJOR_MATCHERS: BumpMatcher[] = [{ breaking: true }];
export const DEFAULT_MINOR_MATCHERS: BumpMatcher[] = [{ type: 'feat', scope: PACKAGE_TOKEN }];
export const DEFAULT_PATCH_MATCHERS: BumpMatcher[] = [
  { type: 'fix', scope: PACKAGE_TOKEN },
  { type: 'perf', scope: PACKAGE_TOKEN },
];

function criteriaMatches(commit: ConventionalCommit, matcher: BumpMatcher, packageName: string): boolean {
  if (matcher.type !== undefined && commit.type !== matcher.type) return false;
  if (matcher.breaking !== undefined && commit.isBreaking !== matcher.breaking) return false;
  if (matcher.scope !== undefined) {
    const expectedScope = matcher.scope === PACKAGE_TOKEN ? packageName : matcher.scope;
    if (commit.scope !== expectedScope) return false;
  }
  return true;
}

// Scope decides which commits match; `packages` (or, absent it, the scope-equals-package
// fallback) decides which packages a match releases. The `<package>` token ties both to the
// same package, so it needs no separate attribution check.
function attributionMatches(matcher: BumpMatcher, commit: ConventionalCommit, packageName: string): boolean {
  if (matcher.scope === PACKAGE_TOKEN) return true;
  if (matcher.packages === '*') return true;
  if (Array.isArray(matcher.packages)) return matcher.packages.includes(packageName);
  return commit.scope === packageName;
}

function matchesAny(commit: ConventionalCommit, matchers: BumpMatcher[], packageName: string): boolean {
  return matchers.some((matcher) => criteriaMatches(commit, matcher, packageName) && attributionMatches(matcher, commit, packageName));
}

/** Highest bump level this commit triggers for the given package, or NONE if it matches nothing. */
export function resolveBumpLevel(commit: ConventionalCommit, bumps: BumpMatchers, packageName: string): SemVerBumpType {
  if (matchesAny(commit, bumps.major, packageName)) return SemVerBumpType.MAJOR;
  if (matchesAny(commit, bumps.minor, packageName)) return SemVerBumpType.MINOR;
  if (matchesAny(commit, bumps.patch, packageName)) return SemVerBumpType.PATCH;
  return SemVerBumpType.NONE;
}

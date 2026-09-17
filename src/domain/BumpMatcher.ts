import { ConventionalCommit } from './ConventionalCommit.js';
import { SemVerBumpType } from './SemVerBumpType.js';

// Reserved scope token meaning "equals the name of the package being considered".
export const PACKAGE_TOKEN = '<package>';

export interface BumpMatcherRule {
  type?: string;
  scope?: string;
  breaking?: boolean;
  packages?: '*' | string[];
}

export interface BumpMatchers {
  major: BumpMatcherRule[];
  minor: BumpMatcherRule[];
  patch: BumpMatcherRule[];
}

export const DEFAULT_MAJOR_MATCHERS: BumpMatcherRule[] = [{ breaking: true }];
export const DEFAULT_MINOR_MATCHERS: BumpMatcherRule[] = [{ type: 'feat', scope: PACKAGE_TOKEN }];
export const DEFAULT_PATCH_MATCHERS: BumpMatcherRule[] = [
  { type: 'fix', scope: PACKAGE_TOKEN },
  { type: 'perf', scope: PACKAGE_TOKEN },
];

function criteriaMatches(commit: ConventionalCommit, matcher: BumpMatcherRule, packageName: string): boolean {
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
function attributionMatches(matcher: BumpMatcherRule, commit: ConventionalCommit, packageName: string): boolean {
  if (matcher.scope === PACKAGE_TOKEN) return true;
  if (matcher.packages === '*') return true;
  if (Array.isArray(matcher.packages)) return matcher.packages.includes(packageName);
  return commit.scope === packageName;
}

function matchesAny(commit: ConventionalCommit, matchers: BumpMatcherRule[], packageName: string): boolean {
  return matchers.some((matcher) => criteriaMatches(commit, matcher, packageName) && attributionMatches(matcher, commit, packageName));
}

export class BumpMatcher {
  constructor(private readonly bumps: BumpMatchers) {}

  /** Highest bump level this commit triggers for the given package, or NONE if it matches nothing. */
  resolveLevel(commit: ConventionalCommit, packageName: string): SemVerBumpType {
    if (matchesAny(commit, this.bumps.major, packageName)) return SemVerBumpType.MAJOR;
    if (matchesAny(commit, this.bumps.minor, packageName)) return SemVerBumpType.MINOR;
    if (matchesAny(commit, this.bumps.patch, packageName)) return SemVerBumpType.PATCH;
    return SemVerBumpType.NONE;
  }
}

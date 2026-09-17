import { BumpMatcherRule, ConventionalCommit, PACKAGE_TOKEN } from './ConventionalCommit.js';
import { SemVerBumpType } from './SemVerBumpType.js';

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

export class BumpMatcher {
  constructor(private readonly bumps: BumpMatchers) {}

  /** Highest bump level this commit triggers for the given package, or NONE if it matches nothing. */
  resolveLevel(commit: ConventionalCommit, packageName: string): SemVerBumpType {
    if (commit.matchesAny(this.bumps.major, packageName)) return SemVerBumpType.MAJOR;
    if (commit.matchesAny(this.bumps.minor, packageName)) return SemVerBumpType.MINOR;
    if (commit.matchesAny(this.bumps.patch, packageName)) return SemVerBumpType.PATCH;
    return SemVerBumpType.NONE;
  }
}

import { SemVerBumpType } from './SemVerBumpType.js';

export interface ConventionalCommitJSON {
  type: string;
  scope: string | null;
  subject: string;
  isBreaking: boolean;
  hash: string | null;
}

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

export class ConventionalCommit {
  constructor(
    readonly type: string,
    readonly scope: string | null,
    readonly subject: string,
    readonly isBreaking: boolean,
    readonly hash: string | null = null,
  ) {}

  toJSON(): ConventionalCommitJSON {
    return { type: this.type, scope: this.scope, subject: this.subject, isBreaking: this.isBreaking, hash: this.hash };
  }

  static fromJSON(data: ConventionalCommitJSON): ConventionalCommit {
    return new ConventionalCommit(data.type, data.scope, data.subject, data.isBreaking, data.hash);
  }

  static parse(raw: string): ConventionalCommit {
    const trimmedRaw = raw.trim();
    const hashMatch = trimmedRaw.match(/^([0-9a-f]{7,40})\s+([\s\S]+)$/i);
    const commitHash = hashMatch ? hashMatch[1] : null;
    const commitMessage = hashMatch ? hashMatch[2] : trimmedRaw;

    const match = commitMessage.match(/^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s*(.+)$/);
    if (!match) {
      return new ConventionalCommit('unknown', null, commitMessage, false, commitHash);
    }

    const [, type, scope, bang, subject] = match;
    const isBreaking = !!bang || commitMessage.includes('BREAKING CHANGE');

    return new ConventionalCommit(type, scope || null, subject, isBreaking, commitHash);
  }

  /** Highest bump level this commit triggers for the given package, or NONE if it matches nothing. */
  bumpMatch(bumpConfig: BumpMatchers, packageName: string): SemVerBumpType {
    if (this.matchesAny(bumpConfig.major, packageName)) return SemVerBumpType.MAJOR;
    if (this.matchesAny(bumpConfig.minor, packageName)) return SemVerBumpType.MINOR;
    if (this.matchesAny(bumpConfig.patch, packageName)) return SemVerBumpType.PATCH;
    return SemVerBumpType.NONE;
  }

  /** Whether this commit matches any of the given matchers for the given package. */
  private matchesAny(matchers: BumpMatcherRule[], packageName: string): boolean {
    return matchers.some((matcher) => this.matchesCriteria(matcher, packageName) && this.matchesAttribution(matcher, packageName));
  }

  private matchesCriteria(matcher: BumpMatcherRule, packageName: string): boolean {
    if (matcher.type !== undefined && this.type !== matcher.type) return false;
    if (matcher.breaking !== undefined && this.isBreaking !== matcher.breaking) return false;
    if (matcher.scope !== undefined) {
      const expectedScope = matcher.scope === PACKAGE_TOKEN ? packageName : matcher.scope;
      if (this.scope !== expectedScope) return false;
    }
    return true;
  }

  // Scope decides which commits match; `packages` (or, absent it, the scope-equals-package
  // fallback) decides which packages a match releases. The `<package>` token ties both to the
  // same package, so it needs no separate attribution check.
  private matchesAttribution(matcher: BumpMatcherRule, packageName: string): boolean {
    if (matcher.scope === PACKAGE_TOKEN) return true;
    if (matcher.packages === '*') return true;
    if (Array.isArray(matcher.packages)) return matcher.packages.includes(packageName);
    return this.scope === packageName;
  }
}

export const filterCommitsByType = (commits: ConventionalCommit[], type: string): ConventionalCommit[] => commits.filter((commit) => commit.type === type);

export const filterCommitsExcludingTypes = (commits: ConventionalCommit[], types: string[]): ConventionalCommit[] =>
  commits.filter((commit) => !types.includes(commit.type));

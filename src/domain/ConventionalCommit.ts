import { SemVerBumpType } from './SemVerBumpType';

export interface ConventionalCommitJSON {
  type: string;
  scope: string | null;
  subject: string;
  isBreaking: boolean;
  hash: string | null;
}

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

  get bumpType(): SemVerBumpType {
    if (this.isBreaking) return SemVerBumpType.MAJOR;
    if (this.type === 'feat') return SemVerBumpType.MINOR;
    if (this.type === 'fix' || this.type === 'perf') return SemVerBumpType.PATCH;
    return SemVerBumpType.NONE;
  }

  isReleaseTrigger(): boolean {
    return this.bumpType !== SemVerBumpType.NONE;
  }

  matchesScope(packageName: string): boolean {
    return this.scope === packageName;
  }
}

export const filterCommitsByType = (commits: ConventionalCommit[], type: string): ConventionalCommit[] => commits.filter((commit) => commit.type === type);

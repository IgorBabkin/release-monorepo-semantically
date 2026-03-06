import { SemVerBumpType } from './SemVerBumpType';

export class ConventionalCommit {
  constructor(
    readonly type: string,
    readonly scope: string | null,
    readonly subject: string,
    readonly isBreaking: boolean,
    readonly hash: string | null = null,
  ) {}

  static parse(raw: string): ConventionalCommit {
    const trimmedRaw = raw.trim();
    const firstSpace = trimmedRaw.indexOf(' ');
    const commitHash = firstSpace === -1 ? null : trimmedRaw.slice(0, firstSpace);
    const commitMessage = firstSpace === -1 ? trimmedRaw : trimmedRaw.slice(firstSpace + 1);

    const match = commitMessage.match(/^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s*(.+)$/);
    if (!match) {
      return new ConventionalCommit('unknown', null, commitMessage, false, commitHash);
    }

    const [, type, scope, bang, subject] = match;
    const isBreaking = !!bang || raw.includes('BREAKING CHANGE');

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

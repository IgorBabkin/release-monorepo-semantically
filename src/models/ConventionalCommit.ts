import { SemVerBumpType } from './SemVerBumpType';

export class ConventionalCommit {
  constructor(
    readonly type: string,
    readonly scope: string | null,
    readonly subject: string,
    readonly isBreaking: boolean,
  ) {}

  static parse(raw: string): ConventionalCommit {
    const match = raw.match(/^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s*(.+)$/);
    if (!match) {
      return new ConventionalCommit('unknown', null, raw, false);
    }

    const [, type, scope, bang, subject] = match;
    const isBreaking = !!bang || raw.includes('BREAKING CHANGE');

    return new ConventionalCommit(type, scope || null, subject, isBreaking);
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

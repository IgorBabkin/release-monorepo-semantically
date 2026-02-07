import {SemVerBumpType} from './SemVerBumpType';

export class ConventionalCommit {
    constructor(
        readonly hash: string,
        readonly type: string,
        readonly scope: string | null,
        readonly subject: string,
        readonly body: string | null,
        readonly footer: Record<string, string>,
        readonly isBreaking: boolean,
    ) {
    }

    static parse(raw: string, hash: string): ConventionalCommit {
        const match = raw.match(/^(\w+)(?:\(([^)]*)\))?(!)?\s*:\s*(.+)$/);
        if (!match) {
            return new ConventionalCommit(hash, 'unknown', null, raw, null, {}, false);
        }

        const [, type, scope, bang, subject] = match;
        const isBreaking = !!bang || raw.includes('BREAKING CHANGE');

        return new ConventionalCommit(hash, type, scope || null, subject, null, {}, isBreaking);
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

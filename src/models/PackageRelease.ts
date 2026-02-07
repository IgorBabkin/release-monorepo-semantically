import {ConventionalCommit} from './ConventionalCommit';
import {DependencyUpdate} from './DependencyUpdate';
import {ChangelogEntry} from './ChangelogEntry';
import {SemVerBumpType, bumpVersion} from './SemVerBumpType';
import {NpmPackage} from './NpmPackage';

export class PackageRelease {
    readonly bumpType: SemVerBumpType;
    readonly newVersion: string;

    constructor(
        readonly pkg: NpmPackage,
        readonly commits: ConventionalCommit[],
        readonly dependencyUpdates: DependencyUpdate[],
    ) {
        const commitBumps = commits.map((c) => c.bumpType);
        const depBump = dependencyUpdates.length > 0 ? SemVerBumpType.MINOR : SemVerBumpType.NONE;
        this.bumpType = Math.max(SemVerBumpType.NONE, ...commitBumps, depBump);
        this.newVersion = bumpVersion(this.pkg.version, this.bumpType);
    }

    get oldVersion(): string {
        return this.pkg.version;
    }

    get tag(): string {
        return `${this.pkg.name}@${this.newVersion}`;
    }

    toChangelogEntry(): ChangelogEntry {
        return {
            version: this.newVersion,
            oldVersion: this.oldVersion,
            date: new Date().toISOString().split('T')[0],
            breakingChanges: this.commits.filter((c) => c.isBreaking),
            features: this.commits.filter((c) => c.type === 'feat' && !c.isBreaking),
            fixes: this.commits.filter((c) => c.type === 'fix'),
            performance: this.commits.filter((c) => c.type === 'perf'),
            dependencyUpdates: this.dependencyUpdates,
        };
    }
}

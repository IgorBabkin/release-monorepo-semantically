import {ConventionalCommit} from './ConventionalCommit';
import {DependencyUpdate} from './DependencyUpdate';

export interface ChangelogEntry {
    readonly version: string;
    readonly oldVersion: string;
    readonly date: string;
    readonly breakingChanges: ConventionalCommit[];
    readonly features: ConventionalCommit[];
    readonly fixes: ConventionalCommit[];
    readonly performance: ConventionalCommit[];
    readonly dependencyUpdates: DependencyUpdate[];
}

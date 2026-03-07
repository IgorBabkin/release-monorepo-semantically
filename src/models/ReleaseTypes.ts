import { NpmPackage } from './NpmPackage';

export interface DependencyVersionChange {
  packageName: string;
  oldVersion: string;
  newVersion: string;
}

export interface ReleaseCommitChange {
  type: string;
  subject: string;
  isBreaking: boolean;
}

export interface ReleaseCommitPackage {
  name: string;
  version: string;
  previousVersion: string;
  commits: ReleaseCommitChange[];
  dependencyUpdates: DependencyVersionChange[];
}

export interface ReleasedPackageVersion {
  pkg: NpmPackage;
  version: string;
}

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

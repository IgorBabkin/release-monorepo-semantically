import { ConventionalCommit } from '../models/ConventionalCommit';
import { NpmPackage } from '../models/NpmPackage';

export interface PackageReleasedPluginContext {
  dryRun: boolean;
  noPush: boolean;
  noPublish: boolean;
  pkg: NpmPackage;
  releasedVersions: Map<string, string>;
  releasedPackages: NpmPackage[];
  releasedCommits: ConventionalCommit[];
}

export interface ReleaseCompletePluginContext {
  dryRun: boolean;
  noPush: boolean;
  noPublish: boolean;
  releasedVersions: Map<string, string>;
  releasedPackages: NpmPackage[];
  releasedCommits: Map<string, ConventionalCommit[]>;
}

export interface ReleasePlugin {
  onPackageReleased?(context: PackageReleasedPluginContext): void;
  onReleaseComplete?(context: ReleaseCompletePluginContext): void;
}

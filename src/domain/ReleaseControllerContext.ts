import { ConventionalCommit, ConventionalCommitJSON } from './ConventionalCommit';
import { NpmPackage, NpmPackageJSON } from './NpmPackage';

export interface ReleaseControllerContext {
  releasedVersions: Map<string, string>;
  releasedPackages: NpmPackage[];
  releasedCommits: Map<string, ConventionalCommit[]>;
}

interface SerializedReleaseControllerContext {
  releasedVersions: Record<string, string>;
  releasedPackages: NpmPackageJSON[];
  releasedCommits: Record<string, ConventionalCommitJSON[]>;
}

export function serializeContext(ctx: ReleaseControllerContext): string {
  const data: SerializedReleaseControllerContext = {
    releasedVersions: Object.fromEntries(ctx.releasedVersions),
    releasedPackages: ctx.releasedPackages.map((p) => p.toJSON()),
    releasedCommits: Object.fromEntries([...ctx.releasedCommits.entries()].map(([k, v]) => [k, v.map((c) => c.toJSON())])),
  };
  return JSON.stringify(data);
}

export function deserializeContext(json: string): ReleaseControllerContext {
  const data: SerializedReleaseControllerContext = JSON.parse(json);
  return {
    releasedVersions: new Map(Object.entries(data.releasedVersions)),
    releasedPackages: data.releasedPackages.map(NpmPackage.fromJSON),
    releasedCommits: new Map(Object.entries(data.releasedCommits).map(([k, v]) => [k, v.map(ConventionalCommit.fromJSON)])),
  };
}

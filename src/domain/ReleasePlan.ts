import { ReleaseControllerContext } from './ReleaseControllerContext.js';
import { DependencyVersionChange } from './ReleaseTypes.js';
import { bumpTypeToString, detectBumpType, SemVerBumpType } from './SemVerBumpType.js';

/** What a single package's release looks like, as `--verbose` reports it. */
export interface ReleasePlanEntry {
  packageName: string;
  fromVersion: string;
  toVersion: string;
  bumpType: SemVerBumpType;
  commitCount: number;
  dependencyUpdates: DependencyVersionChange[];
}

export function buildReleasePlan(context: ReleaseControllerContext): ReleasePlanEntry[] {
  const { releasedPackages, releasedVersions, releasedCommits } = context;

  return releasedPackages.flatMap((pkg) => {
    const toVersion = releasedVersions.get(pkg.name);
    // A package without a new version is not part of this release; `report`
    // never puts one in `releasedPackages`, but a hand-assembled context can.
    if (!toVersion) {
      return [];
    }

    return [
      {
        packageName: pkg.name,
        fromVersion: pkg.version,
        toVersion,
        bumpType: detectBumpType(pkg.version, toVersion),
        commitCount: releasedCommits.get(pkg.name)?.length ?? 0,
        dependencyUpdates: pkg.getDependencyUpdates(releasedVersions),
      },
    ];
  });
}

export function formatReleasePlan(plan: ReleasePlanEntry[]): string[] {
  if (plan.length === 0) {
    return ['PLAN     no packages affected'];
  }

  return [`PLAN     ${plan.length} package(s) affected`, ...plan.map(formatPlanEntry)];
}

function formatPlanEntry(entry: ReleasePlanEntry): string {
  const details = [bumpTypeToString(entry.bumpType) ?? 'none', `${entry.commitCount} commit(s)`];
  if (entry.dependencyUpdates.length > 0) {
    details.push(`deps: ${entry.dependencyUpdates.map((update) => `${update.packageName}@${update.newVersion}`).join(', ')}`);
  }
  return `PLAN     ${entry.packageName} ${entry.fromVersion} -> ${entry.toVersion} (${details.join(', ')})`;
}

/**
 * Reports the release plan at most once per controller instance. A controller's
 * default action can fan out into several methods sharing one invocation (`vcs`
 * runs commit, then tag, then push), and each of them receives the same
 * `--context`; without the guard the plan would be repeated once per action.
 */
export const createReleasePlanReporter = (log: (message: string) => void) => {
  let reported = false;

  return (context: ReleaseControllerContext, verbose: boolean): void => {
    if (!verbose || reported) {
      return;
    }

    reported = true;
    for (const line of formatReleasePlan(buildReleasePlan(context))) {
      log(line);
    }
  };
};

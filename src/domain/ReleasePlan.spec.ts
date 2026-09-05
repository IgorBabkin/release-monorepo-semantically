import { describe, expect, it } from 'vitest';
import { buildReleasePlan, createReleasePlanReporter, formatReleasePlan } from './ReleasePlan.js';
import { NpmPackage } from './NpmPackage.js';
import { ConventionalCommit } from './ConventionalCommit.js';
import { SemVerBumpType } from './SemVerBumpType.js';
import { ReleaseControllerContext } from './ReleaseControllerContext.js';

const pkgA = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
const pkgB = NpmPackage.createFromPackage({ name: 'pkg-b', version: '2.3.4', dependencies: { 'pkg-a': '1.0.0' } }, '/repo/packages/pkg-b');

const contextOf = (
  versions: Array<[string, string]>,
  packages: NpmPackage[],
  commits: Array<[string, ConventionalCommit[]]> = [],
): ReleaseControllerContext => ({
  releasedVersions: new Map(versions),
  releasedPackages: packages,
  releasedCommits: new Map(commits),
});

describe('buildReleasePlan', () => {
  it('given a released package when the plan is built then it carries the affected versions and the bump they represent', () => {
    const context = contextOf([['pkg-a', '2.0.0']], [pkgA], [['pkg-a', [ConventionalCommit.parse('feat(pkg-a)!: drop legacy api')]]]);

    expect(buildReleasePlan(context)).toEqual([
      {
        packageName: 'pkg-a',
        fromVersion: '1.0.0',
        toVersion: '2.0.0',
        bumpType: SemVerBumpType.MAJOR,
        commitCount: 1,
        dependencyUpdates: [],
      },
    ]);
  });

  it('given a dependent package when the plan is built then the internal dependency updates are part of the entry', () => {
    const context = contextOf(
      [
        ['pkg-a', '1.1.0'],
        ['pkg-b', '2.4.0'],
      ],
      [pkgA, pkgB],
    );

    const [, dependent] = buildReleasePlan(context);

    expect(dependent.bumpType).toBe(SemVerBumpType.MINOR);
    expect(dependent.dependencyUpdates).toEqual([{ packageName: 'pkg-a', oldVersion: '1.0.0', newVersion: '1.1.0', sections: ['dependencies'] }]);
  });

  it('given a package without a new version when the plan is built then it is left out of the plan', () => {
    expect(buildReleasePlan(contextOf([], [pkgA]))).toEqual([]);
  });
});

describe('formatReleasePlan', () => {
  it('given an empty plan when it is formatted then it states that nothing is affected', () => {
    expect(formatReleasePlan([])).toEqual(['PLAN     no packages affected']);
  });

  it('given a plan when it is formatted then each package reports its versions, bump type and commit count', () => {
    const context = contextOf(
      [
        ['pkg-a', '1.1.0'],
        ['pkg-b', '2.4.0'],
      ],
      [pkgA, pkgB],
      [['pkg-a', [ConventionalCommit.parse('feat(pkg-a): add feature')]]],
    );

    expect(formatReleasePlan(buildReleasePlan(context))).toEqual([
      'PLAN     2 package(s) affected',
      'PLAN     pkg-a 1.0.0 -> 1.1.0 (minor, 1 commit(s))',
      'PLAN     pkg-b 2.3.4 -> 2.4.0 (minor, 0 commit(s), deps: pkg-a@1.1.0)',
    ]);
  });
});

describe('createReleasePlanReporter', () => {
  it('given verbose is off when the reporter runs then nothing is logged', () => {
    const lines: string[] = [];
    createReleasePlanReporter((line) => lines.push(line))(contextOf([['pkg-a', '1.1.0']], [pkgA]), false);

    expect(lines).toEqual([]);
  });

  it('given several actions sharing one invocation when the reporter runs then the plan is logged once', () => {
    const lines: string[] = [];
    const reportPlan = createReleasePlanReporter((line) => lines.push(line));
    const context = contextOf([['pkg-a', '1.1.0']], [pkgA]);

    reportPlan(context, true);
    reportPlan(context, true);

    expect(lines).toEqual(['PLAN     1 package(s) affected', 'PLAN     pkg-a 1.0.0 -> 1.1.0 (minor, 0 commit(s))']);
  });
});

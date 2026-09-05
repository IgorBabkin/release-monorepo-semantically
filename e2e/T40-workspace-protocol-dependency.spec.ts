import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T40 - internal dependencies on the workspace protocol', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('leaves a workspace protocol specifier alone instead of pinning it to the unpublished version', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '1.0.0', devDependencies: { 'pkg-a': 'workspace:*' } },
    ]);

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    expect(fixture.getPackageJson('pkg-b').devDependencies).toEqual({ 'pkg-a': 'workspace:*' });
  });

  it('skips the lockfile refresh when every declaration is on the workspace protocol', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '1.0.0', devDependencies: { 'pkg-a': 'workspace:*' } },
    ]);
    writeFileSync(path.join(fixture.workDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
    fixture.run('git add pnpm-lock.yaml');
    fixture.run('git commit -m "chore: add lockfile"');

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    // Nothing was rewritten, so the lockfile on disk still matches the manifests.
    expect(fixture.packageManagerInstalls()).toEqual([]);
  });

  it('still releases the dependent, so its published tarball carries the new version', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '1.0.0', devDependencies: { 'pkg-a': 'workspace:*' } },
    ]);

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    expect(fixture.getPackageJson('pkg-b').version).toBe('1.1.0');
    expect(fixture.publishedPackages()).toEqual(['pkg-a@1.1.0', 'pkg-b@1.1.0']);
    expect(fixture.tags()).toEqual(expect.arrayContaining(['pkg-a@1.1.0', 'pkg-b@1.1.0']));
  });

  it('still refreshes the lockfile when an exact specifier sits beside a workspace protocol one', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      {
        name: 'pkg-b',
        version: '1.0.0',
        dependencies: { 'pkg-a': '1.0.0' },
        devDependencies: { 'pkg-a': 'workspace:*' },
      },
    ]);
    writeFileSync(path.join(fixture.workDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
    fixture.run('git add pnpm-lock.yaml');
    fixture.run('git commit -m "chore: add lockfile"');

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    const pkgB = fixture.getPackageJson('pkg-b');
    expect(pkgB.dependencies).toEqual({ 'pkg-a': '1.1.0' });
    expect(pkgB.devDependencies).toEqual({ 'pkg-a': 'workspace:*' });
    expect(fixture.packageManagerInstalls()).toEqual(['install --lockfile-only --ignore-scripts']);
  });
});

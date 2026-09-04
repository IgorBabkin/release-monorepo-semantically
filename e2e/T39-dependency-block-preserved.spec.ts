import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T39 - a bump is written back to the block it was read from', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('updates a devDependency in place, leaves the peer range alone and adds no dependencies block', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      {
        name: 'pkg-b',
        version: '1.0.0',
        peerDependencies: { 'pkg-a': '>=1' },
        devDependencies: { 'pkg-a': '1.0.0' },
      },
    ]);

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');

    const pkgB = fixture.getPackageJson('pkg-b');
    expect(pkgB.devDependencies).toEqual({ 'pkg-a': '1.1.0' });
    expect(pkgB.peerDependencies).toEqual({ 'pkg-a': '>=1' });
    expect(pkgB.dependencies).toBeUndefined();
  });

  it('updates a runtime dependency without touching devDependencies', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      {
        name: 'pkg-b',
        version: '1.0.0',
        dependencies: { 'pkg-a': '1.0.0' },
        devDependencies: { typescript: '5.3.3' },
      },
    ]);

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    const pkgB = fixture.getPackageJson('pkg-b');
    expect(pkgB.dependencies).toEqual({ 'pkg-a': '1.1.0' });
    expect(pkgB.devDependencies).toEqual({ typescript: '5.3.3' });
  });

  it('refreshes the lockfile once the manifests have been rewritten', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '1.0.0', devDependencies: { 'pkg-a': '1.0.0' } },
    ]);
    writeFileSync(path.join(fixture.workDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
    fixture.run('git add pnpm-lock.yaml');
    fixture.run('git commit -m "chore: add lockfile"');

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    expect(fixture.packageManagerInstalls()).toEqual(['install --lockfile-only --ignore-scripts']);
  });

  it('leaves a workspace without a lockfile alone', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '1.0.0', devDependencies: { 'pkg-a': '1.0.0' } },
    ]);

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    expect(fixture.packageManagerInstalls()).toEqual([]);
  });

  it('given dry run then neither the manifest nor the lockfile is touched', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '1.0.0', devDependencies: { 'pkg-a': '1.0.0' } },
    ]);
    writeFileSync(path.join(fixture.workDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
    fixture.run('git add pnpm-lock.yaml');
    fixture.run('git commit -m "chore: add lockfile"');

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release({ dryRun: true }).status).toBe('passed');

    expect(fixture.getPackageJson('pkg-b').devDependencies).toEqual({ 'pkg-a': '1.0.0' });
    expect(fixture.packageManagerInstalls()).toEqual([]);
  });
});

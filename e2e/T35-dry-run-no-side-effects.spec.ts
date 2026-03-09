import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T35 - dry run has no side effects', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given a releasable change when --dry-run is used then no files, commits, tags or publishes are changed', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('feat(pkg-a): preview release only', 'pkg-a');

    const beforeHead = fixture.run('vcs rev-parse HEAD');
    const beforeTags = new Set(fixture.tags());
    const beforeStatus = fixture.run('vcs status --porcelain');
    const beforePackageJson = fixture.run('cat packages/pkg-a/package.json');

    const outcome = fixture.release('--dry-run');

    expect(outcome.status).toBe('passed');
    expect(fixture.run('vcs rev-parse HEAD')).toBe(beforeHead);
    expect(new Set(fixture.tags())).toEqual(beforeTags);
    expect(fixture.publishedPackages()).toEqual([]);
    expect(fixture.run('vcs status --porcelain')).toBe(beforeStatus);
    expect(fixture.run('cat packages/pkg-a/package.json')).toBe(beforePackageJson);
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.0');
  });
});

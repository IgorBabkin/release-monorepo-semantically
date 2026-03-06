import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T27 - second run without changes is idempotent', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('does not generate additional release metadata when unchanged', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('feat(pkg-a): first change', 'pkg-a');

    expect(fixture.release().status).toBe('passed');
    const firstVersion = fixture.getPackageJson('pkg-a').version;
    const firstTags = new Set(fixture.tags());
    const changelogBeforeSecondRun = fixture.run('cat packages/pkg-a/CHANGELOG.md');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe(firstVersion);
    expect(new Set(fixture.tags())).toEqual(firstTags);
    expect(fixture.run('cat packages/pkg-a/CHANGELOG.md')).toBe(changelogBeforeSecondRun);
  });
});

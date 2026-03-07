import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T35 - dry run skips commit and tags only', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given a releaseable change when --dry-run is used then files may change but commits and tags are not created', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('feat(pkg-a): preview release only', 'pkg-a');

    const beforeHead = fixture.run('git rev-parse HEAD');
    const beforeTags = new Set(fixture.tags());

    const outcome = fixture.release('--dry-run');

    expect(outcome.status).toBe('passed');
    expect(fixture.run('git rev-parse HEAD')).toBe(beforeHead);
    expect(new Set(fixture.tags())).toEqual(beforeTags);
    expect(fixture.publishedPackages()).toEqual([]);
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.1.0');
  });
});

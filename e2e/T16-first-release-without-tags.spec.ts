import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T16 - first release without prior tags', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('releases from current version when no package tag exists', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }], true, false);
    fixture.commit('fix(pkg-a): initial release without tag', 'pkg-a');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.1');
    expect(fixture.tags()).toContain('pkg-a@1.0.1');
  });
});

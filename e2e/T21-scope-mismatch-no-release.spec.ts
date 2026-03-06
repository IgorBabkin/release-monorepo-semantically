import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T21 - non-matching scope should not release package', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('ignores commits for unrelated scope', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('feat(other): unrelated scope change', 'pkg-a');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.0');
  });
});

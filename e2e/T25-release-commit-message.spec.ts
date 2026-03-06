import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T25 - release commit message format', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('uses release subject expected by release policy', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('feat(pkg-a): add feature', 'pkg-a');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    expect(fixture.run('git log -1 --pretty=%s')).toBe('ci: release [skip-ci]');
  });
});

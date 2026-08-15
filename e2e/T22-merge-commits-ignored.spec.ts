import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T22 - merge-like commits without conventional payload are ignored', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('does not bump version on non-conventional merge message', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.run('git commit --allow-empty -m "Merge branch feature into main"');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.0');
  });
});

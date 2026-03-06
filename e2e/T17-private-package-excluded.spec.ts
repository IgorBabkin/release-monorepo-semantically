import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T17 - private package is excluded from release flow', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('does not release private packages even with release commits', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-public', version: '1.0.0' },
      { name: 'pkg-private', version: '1.0.0', private: true },
    ]);

    fixture.commit('feat(pkg-private): new private functionality', 'pkg-private');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');

    expect(fixture.getPackageJson('pkg-public').version).toBe('1.0.0');
    expect(fixture.getPackageJson('pkg-private').version).toBe('1.0.0');
    expect(fixture.tags()).not.toContain('pkg-private@1.1.0');
  });
});

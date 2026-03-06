import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T20 - dependency updates use exact versions and trigger minor release', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('normalizes internal dependency ranges and releases dependents', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-core', version: '1.0.0' },
      { name: 'pkg-client', version: '1.0.0', dependencies: { 'pkg-core': '^1.0.0' } },
    ]);

    fixture.commit('feat(pkg-core): change API contract', 'pkg-core');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');

    const after = fixture.getPackageJson('pkg-client');
    expect(after.dependencies?.['pkg-core']).toBe('1.1.0');
    expect(after.dependencies?.['pkg-core']).not.toContain('^');
  });
});

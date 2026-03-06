import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T28 - bump type maps to pnpm version increments', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('bumps minor for feat and patch for fix', () => {
    const featureFixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    featureFixture.commit('feat(pkg-a): major feature', 'pkg-a');
    expect(featureFixture.release().status).toBe('passed');
    expect(featureFixture.getPackageJson('pkg-a').version).toBe('1.1.0');

    const fixFixture = createMonorepoFixture([{ name: 'pkg-b', version: '1.0.0' }]);
    fixFixture.commit('fix(pkg-b): bug fix', 'pkg-b');
    expect(fixFixture.release().status).toBe('passed');
    expect(fixFixture.getPackageJson('pkg-b').version).toBe('1.0.1');
  });
});

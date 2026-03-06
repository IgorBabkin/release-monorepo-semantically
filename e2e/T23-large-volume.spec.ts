import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T23 - large commit volume is handled', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('processes many commits without crashing', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    for (let index = 0; index < 25; index += 1) {
      fixture.commit(`fix(pkg-a): stability improvement ${index}`, 'pkg-a');
    }

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.1');
  });
});

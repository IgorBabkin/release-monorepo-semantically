import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T24 - partial failure leaves artifacts for inspection', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('keeps version changes and tags when push fails', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }], false);
    fixture.commit('feat(pkg-a): failed later in pipeline', 'pkg-a');

    const outcome = fixture.release();
    expect(outcome.status).toBe('failed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.1.0');
    expect(fixture.tags()).toContain('pkg-a@1.1.0');
  });
});

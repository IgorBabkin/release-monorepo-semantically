import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T24 - partial failure leaves artifacts for inspection', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given no remote and push or publish are disabled when release runs then local artifacts are still created', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }], false);
    fixture.commit('feat(pkg-a): failed later in pipeline', 'pkg-a');

    const outcome = fixture.release(['--no-push', '--no-publish']);
    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.1.0');
    expect(fixture.tags()).toContain('pkg-a@1.1.0');
    expect(fixture.publishedPackages()).toEqual([]);
  });
});

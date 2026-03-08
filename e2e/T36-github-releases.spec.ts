import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T36 - github releases via plugin', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('creates github release entries when running in github actions environment', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('fix(pkg-a): ship release notes', 'pkg-a');

    const outcome = fixture.release(undefined, {
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'acme/repo',
      GITHUB_TOKEN: 'token',
    });

    expect(outcome.status).toBe('passed');
    expect(fixture.githubReleases()).toEqual([
      {
        tagName: 'pkg-a@1.0.1',
        repository: 'acme/repo',
        title: 'pkg-a v1.0.1',
        notes: expect.stringContaining('fix: ship release notes'),
        prerelease: false,
      },
    ]);
  });

  it('skips github release creation on dry-run and when push is disabled', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('fix(pkg-a): no release artifact', 'pkg-a');

    const dryRunOutcome = fixture.release('--dry-run', {
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'acme/repo',
      GITHUB_TOKEN: 'token',
    });
    expect(dryRunOutcome.status).toBe('passed');
    expect(fixture.githubReleases()).toEqual([]);

    const noPushOutcome = fixture.release('--no-push', {
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'acme/repo',
      GITHUB_TOKEN: 'token',
    });
    expect(noPushOutcome.status).toBe('passed');
    expect(fixture.githubReleases()).toEqual([]);
  });
});

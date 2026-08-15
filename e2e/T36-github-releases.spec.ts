import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';

describe('T36 - GitHub release notes via the release-notes step', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('creates a GitHub release entry when the release-notes step runs', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('fix(pkg-a): ship release notes', 'pkg-a');

    const outcome = fixture.release({
      releaseNotes: true,
      env: { GITHUB_REPOSITORY: 'acme/repo', GITHUB_TOKEN: 'token' },
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

  it('skips release creation on dry-run even when the release-notes step is requested', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('fix(pkg-a): no release artifact', 'pkg-a');

    const outcome = fixture.release({
      dryRun: true,
      releaseNotes: true,
      env: { GITHUB_REPOSITORY: 'acme/repo', GITHUB_TOKEN: 'token' },
    });

    expect(outcome.status).toBe('passed');
    expect(fixture.githubReleases()).toEqual([]);
  });

  it('does not create a release when the release-notes step is not part of the pipeline', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('fix(pkg-a): no release notes requested', 'pkg-a');

    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.githubReleases()).toEqual([]);
  });
});

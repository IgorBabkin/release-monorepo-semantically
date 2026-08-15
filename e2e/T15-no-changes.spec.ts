import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';

describe('T15 - no changes since last release', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('keeps versions unchanged and does not emit new tags', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    const beforeTags = new Set(fixture.tags());
    const beforeVersion = fixture.getPackageJson('pkg-a').version;

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');

    expect(fixture.getPackageJson('pkg-a').version).toBe(beforeVersion);
    expect(new Set(fixture.tags())).toEqual(beforeTags);
    expect(outcome.stderr).toContain('[report] ⚠ SKIP     pkg-a@1.0.0');
    expect(outcome.stderr).not.toContain('WRITE    pkg-a CHANGELOG.md');
  });
});

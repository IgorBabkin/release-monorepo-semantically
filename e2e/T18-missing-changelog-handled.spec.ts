import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T18 - missing changelog file is generated during release', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('creates changelog for packages without prior changelog', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('fix(pkg-a): update behavior', 'pkg-a');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');

    const changelog = fixture.run('cat packages/pkg-a/CHANGELOG.md');
    expect(changelog).toContain('# [1.0.1]');
    expect(changelog).toContain('### 🐞 Bug Fixes');
  });
});

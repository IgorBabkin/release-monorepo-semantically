import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T26 - changelog entries include commit links', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('renders valid commit links in changelog output', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.commit('fix(pkg-a): link check', 'pkg-a');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    const changelog = fixture.run('cat packages/pkg-a/CHANGELOG.md');
    expect(changelog).toMatch(/commit\/[0-9a-f]{7,40}/i);
  });
});

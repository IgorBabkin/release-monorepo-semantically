import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';

describe('T25 - release commit message format', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given multiple bumped packages when release runs then the release commit body lists all package changes', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '2.0.0' },
    ]);
    fixture.commit('feat(pkg-a): add feature', 'pkg-a');
    fixture.commit('fix(pkg-b): resolve bug', 'pkg-b');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    expect(fixture.run('vcs log -1 --pretty=%s')).toBe('ci(release): publish [skip-ci]');

    const commitBody = fixture.run('vcs log -1 --pretty=%B');
    expect(commitBody).toContain('## 📦 pkg-a@1.1.0');
    expect(commitBody).toContain('- 🔹 feat: add feature');
    expect(commitBody).toContain('## 📦 pkg-b@2.0.1');
    expect(commitBody).toContain('- 🔹 fix: resolve bug');
    expect(commitBody).toContain('Affected: 📌');
    expect(commitBody).toContain('pkg-a@1.1.0');
    expect(commitBody).toContain('pkg-b@2.0.1');
  });
});

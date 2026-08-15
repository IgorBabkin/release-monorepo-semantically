import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import { rmSync } from 'node:fs';
import path from 'node:path';

describe('T34 - packaged default templates are used when local templates are absent', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given no local templates when release runs then bundled templates are used', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    rmSync(path.join(fixture.workDir, 'templates'), { recursive: true, force: true });

    fixture.commit('fix(pkg-a): use packaged template defaults', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.run('git log -1 --pretty=%s')).toBe('ci(release): publish [skip-ci]');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T29 - failed push leaves actionable release failure', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('fails with actionable push error when remote is invalid', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    const brokenRemote = path.join(fixture.workDir, 'broken-remote');
    writeFileSync(brokenRemote, 'not a git remote');
    fixture.run(`git remote set-url origin ${JSON.stringify(brokenRemote)}`);

    fixture.commit('feat(pkg-a): push failure expected', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('failed');
    expect(outcome.stderr + outcome.stdout).toContain('fatal');
  });
});

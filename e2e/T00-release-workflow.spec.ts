import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

describe('release CLI e2e', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given a releaseable change when the cli runs then it creates local release artifacts without pushing to origin', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    fixture.commit('fix(pkg-a): exercise release flow', 'pkg-a');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');

    const latestSubject = fixture.run('git log -1 --pretty=%s');
    const branch = fixture.run('git branch --show-current');
    const remoteHead = execSync(`git --git-dir=${JSON.stringify(fixture.remoteDir)} rev-parse refs/heads/${branch}`, {
      cwd: fixture.workDir,
      encoding: 'utf-8',
    }).trim();
    const localHead = fixture.run('git rev-parse HEAD');
    const pkgJson = JSON.parse(readFileSync(path.join(fixture.workDir, 'packages', 'pkg-a', 'package.json'), 'utf-8')) as {
      version: string;
    };

    expect(latestSubject).toBe('ci: release [skip-ci]');
    expect(remoteHead).not.toBe(localHead);
    expect(typeof pkgJson.version).toBe('string');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures, runFixtureCommandCapture } from './releaseFixture';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T19 - lockfile updates are tracked when version changes', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('updates lockfile file content after release', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    const lockPath = path.join(fixture.workDir, 'pnpm-lock.yaml');
    writeFileSync(lockPath, 'lockfile: initial\n');
    fixture.run('git add pnpm-lock.yaml');
    fixture.run('git commit -m "chore: add lockfile"');

    fixture.commit('feat(pkg-a): update lockfile path', 'pkg-a');
    const beforeLock = runFixtureCommandCapture(fixture.workDir, 'cat pnpm-lock.yaml');

    const outcome = fixture.release();
    expect(outcome.status).toBe('passed');
    const afterLock = runFixtureCommandCapture(fixture.workDir, 'cat pnpm-lock.yaml');

    expect(afterLock.status).toBe('passed');
    expect(afterLock.stdout).toBe(beforeLock.stdout);
  });
});

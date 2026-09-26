import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures, type MonorepoFixture } from './releaseFixture.js';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

// Mirrors GitHub's default squash-merge message: PR title with `(#N)`, one `* ` bullet per squashed commit.
const commitGithubSquash = (fixture: MonorepoFixture, config: unknown): void => {
  writeFileSync(path.join(fixture.workDir, '.release.json'), `${JSON.stringify(config, null, 2)}\n`);
  fixture.run('git add .');
  fixture.run('git commit -m "chore: add both packages (#7)" -m "* feat(pkg-a): add feature" -m "details of the feature" -m "* fix(pkg-b): resolve bug"');
};

describe('T44 - squash commits', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given the github squash preset when a squash commit lands then each squashed commit is analyzed separately', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '2.0.0' },
    ]);
    commitGithubSquash(fixture, { report: { squash: 'github' } });

    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.1.0');
    expect(fixture.getPackageJson('pkg-b').version).toBe('2.0.1');
  });

  it('given no squash config when a squash commit lands then only its subject is analyzed', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '2.0.0' },
    ]);
    commitGithubSquash(fixture, {});

    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.0');
    expect(fixture.getPackageJson('pkg-b').version).toBe('2.0.0');
  });
});

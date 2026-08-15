import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('changelog file name override via package.json release section', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('writes to the configured changelog file name instead of CHANGELOG.md', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      release?: { changelog?: { changelogName?: string } };
      [key: string]: unknown;
    };
    rootPackageJson.release = {
      changelog: { changelogName: 'HISTORY.md' },
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    fixture.commit('fix(pkg-a): configured changelog name', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    const changelog = readFileSync(path.join(fixture.workDir, 'packages', 'pkg-a', 'HISTORY.md'), 'utf-8');
    expect(changelog).toContain('# 1.0.1');
    expect(changelog).toContain('configured changelog name');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('template override precedence', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('prioritizes the CLI --template flag over package.json config', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    fixture.writeTemplate('templates/config-release.hbs', 'release from config\n');
    fixture.writeTemplate('templates/cli-release.hbs', 'release from cli\n');

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      release?: { vcs?: { template?: string } };
      [key: string]: unknown;
    };
    rootPackageJson.release = {
      vcs: { template: 'templates/config-release.hbs' },
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    fixture.commit('fix(pkg-a): precedence check', 'pkg-a');
    const outcome = fixture.release({ releaseCommitTemplate: 'templates/cli-release.hbs' });

    expect(outcome.status).toBe('passed');
    expect(fixture.run('git log -1 --pretty=%s')).toBe('release from cli');
  });
});

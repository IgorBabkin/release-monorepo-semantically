import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('template overrides via .release.json', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('prioritizes .release.json template overrides over package.json config', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    fixture.writeTemplate('templates/package-template.hbs', 'release from package json\n');
    fixture.writeTemplate('templates/file-template.hbs', 'release from release json file\n');

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      release?: { vcs?: { template?: string } };
      [key: string]: unknown;
    };
    rootPackageJson.release = {
      vcs: { template: 'templates/package-template.hbs' },
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    const configFilePath = path.join(fixture.workDir, '.release.json');
    writeFileSync(
      configFilePath,
      `${JSON.stringify(
        {
          vcs: { template: 'templates/file-template.hbs' },
        },
        null,
        2,
      )}\n`,
    );

    fixture.commit('fix(pkg-a): prefer file config', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.run('git log -1 --pretty=%s')).toBe('release from release json file');
  });
});

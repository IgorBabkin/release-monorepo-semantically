import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('template overrides via .semantic-release.json', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('prioritizes .semantic-release.json template overrides over package.json config', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    const packageTemplate = path.join(fixture.workDir, 'templates', 'package-template.hbs');
    const fileTemplate = path.join(fixture.workDir, 'templates', 'file-template.hbs');
    writeFileSync(packageTemplate, 'release from package json\n');
    writeFileSync(fileTemplate, 'release from semantic release file\n');

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      releaseTemplates?: {
        releaseCommitTemplate?: string;
      };
      [key: string]: unknown;
    };
    rootPackageJson.releaseTemplates = {
      releaseCommitTemplate: 'templates/package-template.hbs',
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    const configFilePath = path.join(fixture.workDir, '.semantic-release.json');
    writeFileSync(
      configFilePath,
      `${JSON.stringify(
        {
          releaseTemplates: {
            releaseCommitTemplate: 'templates/file-template.hbs',
          },
        },
        null,
        2,
      )}\n`,
    );

    fixture.commit('fix(pkg-a): prefer file config', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.run('vcs log -1 --pretty=%s')).toBe('release from semantic release file');
  });
});

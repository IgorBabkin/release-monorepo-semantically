import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('template override precedence', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('prioritizes CLI template overrides over package.json config', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    const configTemplate = path.join(fixture.workDir, 'templates', 'config-release.hbs');
    const cliTemplate = path.join(fixture.workDir, 'templates', 'cli-release.hbs');
    writeFileSync(configTemplate, 'release from config\n');
    writeFileSync(cliTemplate, 'release from cli\n');

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      releaseTemplates?: {
        releaseCommitTemplate?: string;
      };
      [key: string]: unknown;
    };
    rootPackageJson.releaseTemplates = {
      releaseCommitTemplate: 'templates/config-release.hbs',
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    fixture.commit('fix(pkg-a): precedence check', 'pkg-a');
    const outcome = fixture.release(['--release-commit-template', 'templates/cli-release.hbs']);

    expect(outcome.status).toBe('passed');
    expect(fixture.run('git log -1 --pretty=%s')).toBe('release from cli');
  });
});

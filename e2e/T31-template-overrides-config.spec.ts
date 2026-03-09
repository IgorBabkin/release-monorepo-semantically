import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('template overrides via package.json config', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('uses template overrides from releaseTemplates config', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    const customReleaseTemplate = path.join(fixture.workDir, 'templates', 'release-from-config.hbs');
    writeFileSync(customReleaseTemplate, 'release from config\n');

    const customChangelogTemplate = path.join(fixture.workDir, 'templates', 'changelog-from-config.hbs');
    writeFileSync(customChangelogTemplate, '# CONFIG {{entry.version}}\n{{#each entry.fixes}}{{this.subject}}{{/each}}');

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      workspaces: string[];
      releaseTemplates?: { releaseCommitTemplate?: string; changelogTemplate?: string };
      [key: string]: unknown;
    };
    rootPackageJson.releaseTemplates = {
      releaseCommitTemplate: 'templates/release-from-config.hbs',
      changelogTemplate: 'templates/changelog-from-config.hbs',
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    fixture.commit('fix(pkg-a): changelog from config', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.run('vcs log -1 --pretty=%s')).toBe('release from config');

    const changelog = readFileSync(path.join(fixture.workDir, 'packages', 'pkg-a', 'CHANGELOG.md'), 'utf-8');
    expect(changelog).toContain('# CONFIG 1.0.1');
    expect(changelog).toContain('changelog from config');
  });
});

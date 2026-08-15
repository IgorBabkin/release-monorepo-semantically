import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('template overrides via package.json release section', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('uses template overrides from release section config', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    const customReleaseTemplate = path.join(fixture.workDir, 'templates', 'release-from-release-section.hbs');
    writeFileSync(customReleaseTemplate, 'release from package section\n');

    const customChangelogTemplate = path.join(fixture.workDir, 'templates', 'changelog-from-release-section.hbs');
    writeFileSync(customChangelogTemplate, '# RELEASE SECTION {{entry.version}}\n{{#each entry.fixes}}{{this.subject}}{{/each}}');

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      release?: {
        releaseTemplates?: {
          releaseCommitTemplate?: string;
          changelogTemplate?: string;
        };
      };
      [key: string]: unknown;
    };
    rootPackageJson.release = {
      releaseTemplates: {
        releaseCommitTemplate: 'templates/release-from-release-section.hbs',
        changelogTemplate: 'templates/changelog-from-release-section.hbs',
      },
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    fixture.commit('fix(pkg-a): changelog from release section', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.run('git log -1 --pretty=%s')).toBe('release from package section');

    const changelog = readFileSync(path.join(fixture.workDir, 'packages', 'pkg-a', 'CHANGELOG.md'), 'utf-8');
    expect(changelog).toContain('# RELEASE SECTION 1.0.1');
    expect(changelog).toContain('changelog from release section');
  });
});

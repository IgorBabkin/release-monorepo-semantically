import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('template overrides via package.json config', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('uses template overrides from the release.<step> config section', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    fixture.writeTemplate('templates/release-from-config.hbs', 'release from config\n');
    fixture.writeTemplate(
      'templates/changelog-from-config.hbs',
      '# CONFIG {{lookup releasedVersions pkg.name}}\n{{#each (lookup releasedCommits pkg.name)}}{{this.subject}}{{/each}}',
    );

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      workspaces: string[];
      release?: { vcs?: { template?: string }; changelog?: { template?: string } };
      [key: string]: unknown;
    };
    rootPackageJson.release = {
      vcs: { template: 'templates/release-from-config.hbs' },
      changelog: { template: 'templates/changelog-from-config.hbs' },
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    fixture.commit('fix(pkg-a): changelog from config', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.run('git log -1 --pretty=%s')).toBe('release from config');

    const changelog = readFileSync(path.join(fixture.workDir, 'packages', 'pkg-a', 'CHANGELOG.md'), 'utf-8');
    expect(changelog).toContain('# CONFIG 1.0.1');
    expect(changelog).toContain('changelog from config');
  });
});

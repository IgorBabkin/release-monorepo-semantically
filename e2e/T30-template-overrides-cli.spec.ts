import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('template overrides via CLI', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('uses a custom release commit template', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.writeTemplate('templates/custom-release-commit.hbs', 'custom release commit\n');

    fixture.commit('fix(pkg-a): update for release', 'pkg-a');
    const outcome = fixture.release({ releaseCommitTemplate: 'templates/custom-release-commit.hbs' });

    expect(outcome.status).toBe('passed');
    expect(fixture.run('git log -1 --pretty=%s')).toBe('custom release commit');
  });

  it('uses a custom changelog template', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    fixture.writeTemplate(
      'templates/custom-changelog.hbs',
      '# OVERRIDE {{lookup releasedVersions pkg.name}}\n{{#each (lookup releasedCommits pkg.name)}}{{this.subject}}{{/each}}\n{{existing}}',
    );

    fixture.commit('fix(pkg-a): ensure changelog override', 'pkg-a');
    const outcome = fixture.release({ changelogTemplate: 'templates/custom-changelog.hbs' });

    expect(outcome.status).toBe('passed');
    const changelog = readFileSync(path.join(fixture.workDir, 'packages', 'pkg-a', 'CHANGELOG.md'), 'utf-8');
    expect(changelog).toContain('# OVERRIDE 1.0.1');
    expect(changelog).toContain('ensure changelog override');
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T33 - --help works per command with directory-style workspaces', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given directory workspaces when a step is asked for --help then usage is printed and nothing is released', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }], false);
    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      name: string;
      private: boolean;
      version: string;
      workspaces: string[];
    };

    rootPackageJson.workspaces = ['packages/*'];
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    const outcome = fixture.runCli(['vcs', '--help']);

    expect(outcome.status).toBe('passed');
    expect(outcome.stdout).toContain('Usage:');
    expect(outcome.stdout).toContain('--context');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.0');
  });
});

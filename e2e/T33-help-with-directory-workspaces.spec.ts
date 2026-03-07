import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T33 - help works with directory-style workspaces', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given directory workspaces when --help is requested then usage is printed without package discovery', () => {
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

    const outcome = fixture.release('--help');

    expect(outcome.status).toBe('passed');
    expect(outcome.stderr).toBe('');
    expect(outcome.stdout).toContain('Usage: monorepo-semantic-release [options]');
    expect(fixture.getPackageJson('pkg-a').version).toBe('1.0.0');
  });
});

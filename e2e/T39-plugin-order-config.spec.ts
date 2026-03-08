import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('plugin order via release config', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('given configured release plugins when release runs then only configured plugins run in configured order', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);

    const rootPackageJsonPath = path.join(fixture.workDir, 'package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8')) as {
      release?: {
        plugins?: string[];
      };
      [key: string]: unknown;
    };
    rootPackageJson.release = {
      plugins: ['package-json', 'changelog', 'npm', 'git'],
    };
    writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`);

    fixture.commit('fix(pkg-a): configure plugin execution order', 'pkg-a');
    const outcome = fixture.release();

    expect(outcome.status).toBe('passed');
    expect(fixture.publishedPackages()).toEqual(['pkg-a@1.0.1']);

    const publishLogIndex = outcome.stdout.indexOf('PUBLISH  pkg-a@1.0.1');
    const pushLogIndex = outcome.stdout.indexOf('PUSH     HEAD and 1 tag(s)');
    expect(publishLogIndex).toBeGreaterThan(-1);
    expect(pushLogIndex).toBeGreaterThan(-1);
    expect(publishLogIndex).toBeLessThan(pushLogIndex);
    expect(fixture.githubReleases()).toEqual([]);
  });
});

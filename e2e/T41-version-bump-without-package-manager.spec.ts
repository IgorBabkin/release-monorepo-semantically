import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T41 - the version bump is written into the manifest, not delegated to the package manager', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  it('bumps without invoking `pnpm version`', () => {
    const fixture = createMonorepoFixture([
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '1.0.0', devDependencies: { 'pkg-a': 'workspace:*' } },
    ]);

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    expect(fixture.getPackageJson('pkg-a').version).toBe('1.1.0');
    // `pnpm version` delegates to npm, which resolves the whole workspace
    // before writing: it fails on a sibling's `workspace:*` specifier and runs
    // install lifecycle scripts along the way.
    expect(fixture.packageManagerVersionCalls()).toEqual([]);
  });

  it('leaves every other field of the manifest as it was', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    const manifestPath = path.join(fixture.workDir, 'packages', 'pkg-a', 'package.json');
    const manifest = {
      ...(JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>),
      scripts: { postinstall: 'exit 1' },
      publishConfig: { access: 'public' },
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    fixture.run('git add packages/pkg-a/package.json');
    fixture.run('git commit -m "chore: flesh out the manifest"');

    fixture.commit('feat(pkg-a): add a feature', 'pkg-a');
    expect(fixture.release().status).toBe('passed');

    const released = fixture.getPackageJson('pkg-a') as Record<string, unknown>;
    expect(released.version).toBe('1.1.0');
    expect(released.scripts).toEqual({ postinstall: 'exit 1' });
    expect(released.publishConfig).toEqual({ access: 'public' });
  });
});

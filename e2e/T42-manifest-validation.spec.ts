import { afterEach, describe, expect, it } from 'vitest';
import { createMonorepoFixture, disposeMonorepoFixtures } from './releaseFixture.js';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

describe('T42 - manifests are validated before a release starts', () => {
  afterEach(() => {
    disposeMonorepoFixtures();
  });

  const rewriteManifest = (manifestPath: string, content: unknown, fixture: { run: (cmd: string) => string }): void => {
    writeFileSync(manifestPath, `${JSON.stringify(content, null, 2)}\n`);
    fixture.run('git add .');
    fixture.run('git commit -m "chore: rewrite a manifest"');
  };

  it('fails with an explicit error when the workspace root declares no workspaces', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    const rootManifestPath = path.join(fixture.workDir, 'package.json');
    const rootManifest = JSON.parse(readFileSync(rootManifestPath, 'utf-8')) as Record<string, unknown>;
    delete rootManifest.workspaces;
    rewriteManifest(rootManifestPath, rootManifest, fixture);

    const result = fixture.runCli(['report']);

    // Without the check this reported "nothing to release" and exited 0, which
    // is indistinguishable from a run with no release-worthy commits.
    expect(result.status).toBe('failed');
    expect(result.stderr).toContain('[INVALID_ROOT_PACKAGE_JSON]');
    expect(result.stderr).toContain('workspaces: is required');
  });

  it('fails with an explicit error when a package manifest has no version', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    const manifestPath = path.join(fixture.workDir, 'packages', 'pkg-a', 'package.json');
    rewriteManifest(manifestPath, { name: 'pkg-a' }, fixture);

    const result = fixture.runCli(['report']);

    expect(result.status).toBe('failed');
    expect(result.stderr).toContain('[INVALID_PACKAGE_JSON]');
    expect(result.stderr).toContain('version: is required');
    expect(result.stderr).toContain(manifestPath);
  });

  it('fails with an explicit error when a package version is not a semantic version', () => {
    const fixture = createMonorepoFixture([{ name: 'pkg-a', version: '1.0.0' }]);
    const manifestPath = path.join(fixture.workDir, 'packages', 'pkg-a', 'package.json');
    rewriteManifest(manifestPath, { name: 'pkg-a', version: 'latest' }, fixture);

    const result = fixture.runCli(['report']);

    expect(result.status).toBe('failed');
    expect(result.stderr).toContain('version: must be a semantic version (major.minor.patch)');
  });
});

import { describe, it, expect, vi } from 'vitest';
vi.mock('node:child_process', () => ({ execSync: vi.fn() }));
import * as cp from 'node:child_process';
import { PackageManager } from './PackageManager';

describe('PackageManager.bumpVersion', () => {
  it('runs pnpm version with provided version in provided cwd', () => {
    const pm = new PackageManager();

    pm.bumpVersion('/repo/packages/a', '2.1.0');

    expect(cp.execSync).toHaveBeenCalledWith('pnpm version 2.1.0 --no-git-tag-version', {
      cwd: '/repo/packages/a',
      stdio: 'pipe',
    });
  });
});

describe('PackageManager.publish', () => {
  it('publishes the package from its package directory', () => {
    const pm = new PackageManager();

    pm.publish('/repo/packages/a');

    expect(cp.execSync).toHaveBeenCalledWith('pnpm publish --no-git-checks', {
      cwd: '/repo/packages/a',
      stdio: 'pipe',
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
vi.mock('node:child_process', () => ({ execSync: vi.fn() }));
import * as cp from 'node:child_process';
import { PNPMPackageManager } from './PNPMPackageManager.js';

describe('PNPMPackageManager.publish', () => {
  it('publishes the package from its package directory', () => {
    const pm = new PNPMPackageManager();

    pm.publish('/repo/packages/a');

    expect(cp.execSync).toHaveBeenCalledWith('pnpm publish --no-git-checks', {
      cwd: '/repo/packages/a',
      stdio: 'pipe',
    });
  });
});

describe('PNPMPackageManager.refreshLockfile', () => {
  it('resolves the lockfile against the rewritten manifests without installing', () => {
    const pm = new PNPMPackageManager();

    pm.refreshLockfile('/repo');

    expect(cp.execSync).toHaveBeenCalledWith('pnpm install --lockfile-only --ignore-scripts', {
      cwd: '/repo',
      stdio: 'pipe',
    });
  });

  it('names the lockfile it maintains', () => {
    expect(new PNPMPackageManager().lockfileName).toBe('pnpm-lock.yaml');
  });
});

import { describe, it, expect, vi } from 'vitest';
vi.mock('node:child_process', () => ({ execSync: vi.fn() }));
import * as cp from 'node:child_process';
import { PackageManager } from './PackageManager';
import { SemVerBumpType } from '../models/SemVerBumpType';
import { NpmPackage } from '../models/NpmPackage';

function pkg(name: string, pkgPath: string): NpmPackage {
  return new NpmPackage(name, pkgPath, '1.0.0', false, {}, {});
}

describe('PackageManager.bumpVersion', () => {
  it('does not call npm for NONE', () => {
    const pm = new PackageManager();
    pm.bumpVersion(pkg('a', '/repo/packages/a'), SemVerBumpType.NONE);
    expect(cp.execSync).not.toHaveBeenCalled();
  });

  it('calls npm version major/minor/patch in package cwd', () => {
    const pm = new PackageManager();
    const p = pkg('a', '/repo/packages/a');

    pm.bumpVersion(p, SemVerBumpType.MAJOR);
    expect(cp.execSync).toHaveBeenLastCalledWith('npm version major --no-git-tag-version', {
      cwd: '/repo/packages',
      stdio: 'pipe',
    });

    pm.bumpVersion(p, SemVerBumpType.MINOR);
    expect(cp.execSync).toHaveBeenLastCalledWith('npm version minor --no-git-tag-version', {
      cwd: '/repo/packages',
      stdio: 'pipe',
    });

    pm.bumpVersion(p, SemVerBumpType.PATCH);
    expect(cp.execSync).toHaveBeenLastCalledWith('npm version patch --no-git-tag-version', {
      cwd: '/repo/packages',
      stdio: 'pipe',
    });
  });
});

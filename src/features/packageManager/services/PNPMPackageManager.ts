import 'reflect-metadata';

import { execSync } from 'node:child_process';
import { register } from 'ts-ioc-container';
import { PackageManager, PackageManagerKey } from './PackageManager.js';

import { whenPackageManagerConfigEqual } from '../PackageManagerConfig.js';

@register(PackageManagerKey, whenPackageManagerConfigEqual('kind', 'pnpm'))
export class PNPMPackageManager implements PackageManager {
  readonly lockfileName = 'pnpm-lock.yaml';

  refreshLockfile(cwd: string): void {
    execSync('pnpm install --lockfile-only --ignore-scripts', {
      cwd,
      stdio: 'pipe',
    });
  }

  publish(cwd: string): void {
    execSync('pnpm publish --no-git-checks', {
      cwd,
      stdio: 'pipe',
    });
  }
}

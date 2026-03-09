import 'reflect-metadata';

import { execSync } from 'node:child_process';
import { bindTo, register } from 'ts-ioc-container';
import { PackageManager, PackageManagerKey } from './PackageManager';
import { whenPackageManagerConfigEqual } from '../PackageManagerPlugin';

@register(bindTo(PackageManagerKey), whenPackageManagerConfigEqual('kind', 'pnpm'))
export class PNPMPackageManager implements PackageManager {
  bumpVersion(cwd: string, version: string): void {
    execSync(`pnpm version ${version} --no-git-tag-version`, {
      cwd,
      stdio: 'pipe',
    });
  }

  publish(cwd: string): void {
    execSync('pnpm publish --no-vcs-checks', {
      cwd,
      stdio: 'pipe',
    });
  }
}

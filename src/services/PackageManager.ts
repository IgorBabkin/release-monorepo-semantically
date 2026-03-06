import { execSync } from 'node:child_process';
import { SemVerBumpType } from '../models/SemVerBumpType';
import { NpmPackage } from '../models/NpmPackage';
import path from 'node:path';

export class PackageManager {
  bumpVersion(pkg: NpmPackage, versionBump: SemVerBumpType): void {
    if (versionBump === SemVerBumpType.NONE) {
      return;
    }

    const arg = versionBump === SemVerBumpType.MAJOR ? 'major' : versionBump === SemVerBumpType.MINOR ? 'minor' : 'patch';

    execSync(`pnpm version ${arg} --no-git-tag-version`, {
      cwd: path.dirname(pkg.path),
      stdio: 'pipe',
    });
  }
}

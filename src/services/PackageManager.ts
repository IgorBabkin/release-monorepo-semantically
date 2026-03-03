import { execSync } from 'node:child_process';
import { SemVerBumpType } from '../models/SemVerBumpType';
import { NpmPackage } from '../models/NpmPackage';

export class PackageManager {
  bumpVersion(pkg: NpmPackage, versionBump: SemVerBumpType): void {
    const arg = versionBump === SemVerBumpType.MAJOR ? 'major' : versionBump === SemVerBumpType.MINOR ? 'minor' : 'patch';

    execSync(`npm version ${arg} --no-git-tag-version`, {
      cwd: pkg.path,
      stdio: 'pipe',
    });
  }
}

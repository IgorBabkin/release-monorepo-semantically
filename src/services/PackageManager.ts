import { execSync } from 'node:child_process';

export class PackageManager {
  bumpVersion(cwd: string, version: string): void {
    execSync(`pnpm version ${version} --no-git-tag-version`, {
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

import { execFileSync } from 'node:child_process';

export interface GithubReleaseCreateOptions {
  repository: string;
  token: string;
  tagName: string;
  title: string;
  notes: string;
  prerelease?: boolean;
}

export class GithubService {
  isCliAvailable(): boolean {
    try {
      execFileSync('gh', ['--version'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  createRelease(options: GithubReleaseCreateOptions): void {
    const args = ['release', 'create', options.tagName, '--repo', options.repository, '--title', options.title, '--notes', options.notes];

    if (options.prerelease) {
      args.push('--prerelease');
    }

    try {
      execFileSync('gh', args, {
        stdio: 'pipe',
        env: {
          ...process.env,
          GH_TOKEN: options.token,
        },
      });
    } catch (error) {
      const message = (error as { stderr?: Buffer; message?: string }).stderr?.toString() ?? (error as { message?: string }).message ?? '';
      if (message.includes('already_exists') || message.includes('already exists')) {
        return;
      }
      throw error;
    }
  }
}

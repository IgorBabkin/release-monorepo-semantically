import 'reflect-metadata';

import { execFileSync } from 'node:child_process';
import { bindTo, register } from 'ts-ioc-container';
import { ReleaseNotesCreateOptions, ReleaseNotesService, ReleaseNotesServiceKey } from './ReleaseNotesService';

@register(bindTo(ReleaseNotesServiceKey))
export class GithubService implements ReleaseNotesService {
  isCliAvailable(): boolean {
    try {
      execFileSync('gh', ['--version'], { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  createRelease(options: ReleaseNotesCreateOptions): void {
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

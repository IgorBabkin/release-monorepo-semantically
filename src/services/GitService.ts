import { execSync } from 'node:child_process';
import { VcsService } from './VcsService';
import {bindTo, register} from "ts-ioc-container";
import { VcsServiceKey } from './VcsService';

@register(bindTo(VcsServiceKey))
export class GitService implements VcsService {
  getCommits(sinceTag?: string): string[] {
    const range = sinceTag ? `${sinceTag}..HEAD` : 'HEAD';
    const output = execSync(`git log ${range} --format="%H %s"`, { encoding: 'utf-8' }).trim();
    if (!output) return [];
    return output.split('\n');
  }

  getLatestTag(packageName: string): string | null {
    try {
      return (
        execSync(`git describe --tags --match "${packageName}@*" --abbrev=0`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }).trim() || null
      );
    } catch {
      return null;
    }
  }

  createTag(tagName: string): void {
    execSync(`git tag ${tagName}`);
  }

  commit(message: string): void {
    execSync('git add .');
    execSync(`git commit -m ${JSON.stringify(message)}`);
  }

  push(includeTags: boolean): void {
    execSync('git push');
    if (includeTags) {
      execSync('git push --tags');
    }
  }
}

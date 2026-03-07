import { execSync } from 'node:child_process';
import { ConventionalCommit } from '../models/ConventionalCommit';

export class GitService {
  findManyCommitsSinceTag(sinceTag: string): ConventionalCommit[] {
    const range = this.tagExists(sinceTag) ? `${sinceTag}..HEAD` : 'HEAD';
    const output = execSync(`git log ${range} --format="%H %s"`, { encoding: 'utf-8' }).trim();
    if (!output) return [];
    return output.split('\n').map((c) => ConventionalCommit.parse(c));
  }

  private tagExists(tagName: string): boolean {
    try {
      execSync(`git rev-parse --verify --quiet refs/tags/${tagName}`, { encoding: 'utf-8' }).trim();
      return true;
    } catch {
      return false;
    }
  }

  createTag(tagName: string): void {
    execSync(`git tag ${tagName}`);
  }

  commit(message: string): void {
    const normalizedMessage = message.trim();
    execSync('git add .');
    execSync('git commit --allow-empty -F -', { input: normalizedMessage });
  }

  push(includeTags: boolean): void {
    execSync('git push');
    if (includeTags) {
      execSync('git push --tags');
    }
  }
}

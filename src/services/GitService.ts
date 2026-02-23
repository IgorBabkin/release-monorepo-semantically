import { execSync } from 'node:child_process';
import { ConventionalCommit } from '../models/ConventionalCommit';

export class GitService {
  findManyCommitsSinceTag(sinceTag: string): ConventionalCommit[] {
    const range = `${sinceTag}..HEAD`;
    const output = execSync(`git log ${range} --format="%H %s"`, { encoding: 'utf-8' }).trim();
    if (!output) return [];
    return output.split('\n').map((c) => ConventionalCommit.parse(c));
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

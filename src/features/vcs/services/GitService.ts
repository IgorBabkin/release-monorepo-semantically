import 'reflect-metadata';

import { execSync } from 'node:child_process';
import { ConventionalCommit } from '../../../domain/ConventionalCommit.js';
import { register } from 'ts-ioc-container';
import { VSCService, VSCServiceKey } from './VSCService.js';
import { SquashCommitPattern } from '../../../domain/SquashCommitPattern.js';

import { whenConfig } from '../VCSConfig.js';

@register(VSCServiceKey, whenConfig('kind', 'git'))
export class GitService implements VSCService {
  findManyCommitsSinceTag(sinceTag: string, squash?: SquashCommitPattern): ConventionalCommit[] {
    const range = this.tagExists(sinceTag) ? `${sinceTag}..HEAD` : 'HEAD';
    // Fields separated by the ASCII unit separator, records by the record
    // separator: a body can contain any printable text, including newlines.
    const output = execSync(`git log ${range} --format="%H%x1f%s%x1f%b%x1e"`, { encoding: 'utf-8' }).trim();
    if (!output) return [];
    return output
      .split('\x1e')
      .map((record) => record.trim())
      .filter((record) => record.length > 0)
      .flatMap((record) => {
        const [hash, subject, body = ''] = record.split('\x1f');
        const headers = squash?.findSquashedHeaders(subject, body) ?? [];
        return (headers.length > 0 ? headers : [subject]).map((header) => ConventionalCommit.parse(`${hash} ${header}`));
      });
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
    if (this.tagExists(tagName)) return;
    execSync(`git tag ${tagName}`);
  }

  isWorkingTreeClean(): boolean {
    const output = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    return output.length === 0;
  }

  commit(message: string): void {
    const normalizedMessage = message.trim();
    execSync('git add .');
    execSync('git commit --allow-empty -F -', {
      input: normalizedMessage,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  }

  push(includeTags: boolean): void {
    execSync('git push');
    if (includeTags) {
      execSync('git push --tags');
    }
  }
}

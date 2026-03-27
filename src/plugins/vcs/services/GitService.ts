import 'reflect-metadata';

import { execSync } from 'node:child_process';
import { ConventionalCommit } from '../../../models/ConventionalCommit';
import { bindTo, register } from 'ts-ioc-container';
import { VSCService, VSCServiceKey } from './VSCService';

import { whenConfig } from '../VCSPluginConfig';

@register(bindTo(VSCServiceKey), whenConfig('kind', 'git'))
export class GitService implements VSCService {
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

  isWorkingTreeClean(): boolean {
    const output = execSync('vcs status --porcelain', { encoding: 'utf-8' }).trim();
    return output.length === 0;
  }

  commit(message: string): void {
    const normalizedMessage = message.trim();
    execSync('vcs add .');
    execSync('vcs commit --allow-empty -F -', {
      input: normalizedMessage,
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  }

  push(includeTags: boolean): void {
    execSync('vcs push');
    if (includeTags) {
      execSync('vcs push --tags');
    }
  }
}

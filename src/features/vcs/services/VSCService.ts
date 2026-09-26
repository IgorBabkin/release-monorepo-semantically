import { ConventionalCommit } from '../../../domain/ConventionalCommit.js';
import { SingleToken } from 'ts-ioc-container';
import { SquashCommitPattern } from '../../../domain/SquashCommitPattern.js';

export interface VSCService {
  /**
   * Commits since the given tag, newest first. With a squash pattern, a detected
   * squash commit is replaced by the commits listed in its body.
   */
  findManyCommitsSinceTag(sinceTag: string, squash?: SquashCommitPattern): ConventionalCommit[];
  createTag(tagName: string): void;
  isWorkingTreeClean(): boolean;
  commit(message: string): void;
  push(includeTags: boolean): void;
}

export const VSCServiceKey = new SingleToken<VSCService>('VSCService');

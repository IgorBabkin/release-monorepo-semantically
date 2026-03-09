import { ConventionalCommit } from '../../../models/ConventionalCommit';
import { SingleToken } from 'ts-ioc-container';

export interface VSCService {
  findManyCommitsSinceTag(sinceTag: string): ConventionalCommit[];
  createTag(tagName: string): void;
  isWorkingTreeClean(): boolean;
  commit(message: string): void;
  push(includeTags: boolean): void;
}

export const VSCServiceKey = new SingleToken<VSCService>('VSCService');

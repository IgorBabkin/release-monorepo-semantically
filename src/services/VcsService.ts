import { ConventionalCommit } from '../models/ConventionalCommit';

export interface VcsService {
  createTag(tagName: string): void;
  commit(message: string): void;
  push(includeTags: boolean): void;
  findManyCommitsSinceTag(tag: string): ConventionalCommit[];
}

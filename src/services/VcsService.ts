export interface VcsService {
    getCommits(sinceTag?: string): string[];
    getLatestTag(packageName: string): string | null;
    createTag(tagName: string): void;
    commit(message: string): void;
    push(includeTags: boolean): void;
}

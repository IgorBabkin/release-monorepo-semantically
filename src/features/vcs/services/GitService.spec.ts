import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { GitService } from './GitService';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('GitService', () => {
  beforeEach(() => {
    vi.mocked(execSync).mockReset();
  });

  it('given a commit message when commit runs then vcs hook output is streamed to the terminal', () => {
    const service = new GitService();

    service.commit('ci(release): publish [skip-ci]\n\nbody');

    expect(execSync).toHaveBeenNthCalledWith(1, 'vcs add .');
    expect(execSync).toHaveBeenNthCalledWith(2, 'vcs commit --allow-empty -F -', {
      input: 'ci(release): publish [skip-ci]\n\nbody',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  });

  it('given an existing tag when commit history is queried then commits are read from tag range', () => {
    vi.mocked(execSync).mockReturnValueOnce('refs/tags/pkg-a@1.0.0\n').mockReturnValueOnce('abcd123 fix(pkg-a): bug fix\n');

    const service = new GitService();

    const commits = service.findManyCommitsSinceTag('pkg-a@1.0.0');

    expect(execSync).toHaveBeenNthCalledWith(1, 'git rev-parse --verify --quiet refs/tags/pkg-a@1.0.0', { encoding: 'utf-8' });
    expect(execSync).toHaveBeenNthCalledWith(2, 'git log pkg-a@1.0.0..HEAD --format="%H %s"', { encoding: 'utf-8' });
    expect(commits).toHaveLength(1);
    expect(commits[0].type).toBe('fix');
    expect(commits[0].hash).toBe('abcd123');
  });

  it('given a missing tag when commit history is queried then full history is read from HEAD', () => {
    vi.mocked(execSync)
      .mockImplementationOnce(() => {
        throw new Error('missing tag');
      })
      .mockReturnValueOnce('');

    const service = new GitService();

    const commits = service.findManyCommitsSinceTag('pkg-a@1.0.0');

    expect(execSync).toHaveBeenNthCalledWith(2, 'git log HEAD --format="%H %s"', { encoding: 'utf-8' });
    expect(commits).toEqual([]);
  });

  it('given push with and without tags when push runs then tag push is conditional', () => {
    const service = new GitService();

    service.push(false);
    service.push(true);

    expect(execSync).toHaveBeenNthCalledWith(1, 'vcs push');
    expect(execSync).toHaveBeenNthCalledWith(2, 'vcs push');
    expect(execSync).toHaveBeenNthCalledWith(3, 'vcs push --tags');
  });

  it('given a tag name when createTag runs then vcs tag command is executed', () => {
    const service = new GitService();

    service.createTag('pkg-a@1.0.1');

    expect(execSync).toHaveBeenCalledWith('git tag pkg-a@1.0.1');
  });

  it('given vcs status output when checking tree cleanliness then it returns true only for empty status', () => {
    vi.mocked(execSync).mockReturnValueOnce('').mockReturnValueOnce(' M package.json\n');
    const service = new GitService();

    expect(service.isWorkingTreeClean()).toBe(true);
    expect(service.isWorkingTreeClean()).toBe(false);
    expect(execSync).toHaveBeenNthCalledWith(1, 'vcs status --porcelain', { encoding: 'utf-8' });
    expect(execSync).toHaveBeenNthCalledWith(2, 'vcs status --porcelain', { encoding: 'utf-8' });
  });
});

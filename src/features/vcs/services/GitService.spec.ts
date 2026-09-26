import { beforeEach, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { GitService } from './GitService.js';
import { SquashCommitPattern } from '../../../domain/SquashCommitPattern.js';

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

    expect(execSync).toHaveBeenNthCalledWith(1, 'git add .');
    expect(execSync).toHaveBeenNthCalledWith(2, 'git commit --allow-empty -F -', {
      input: 'ci(release): publish [skip-ci]\n\nbody',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  });

  it('given an existing tag when commit history is queried then commits are read from tag range', () => {
    vi.mocked(execSync).mockReturnValueOnce('refs/tags/pkg-a@1.0.0\n').mockReturnValueOnce('abcd123\x1ffix(pkg-a): bug fix\x1f\x1e\n');

    const service = new GitService();

    const commits = service.findManyCommitsSinceTag('pkg-a@1.0.0');

    expect(execSync).toHaveBeenNthCalledWith(1, 'git rev-parse --verify --quiet refs/tags/pkg-a@1.0.0', { encoding: 'utf-8' });
    expect(execSync).toHaveBeenNthCalledWith(2, 'git log pkg-a@1.0.0..HEAD --format="%H%x1f%s%x1f%b%x1e"', { encoding: 'utf-8' });
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

    expect(execSync).toHaveBeenNthCalledWith(2, 'git log HEAD --format="%H%x1f%s%x1f%b%x1e"', { encoding: 'utf-8' });
    expect(commits).toEqual([]);
  });

  it('given a commit body when no squash pattern is given then only the subject is parsed', () => {
    vi.mocked(execSync)
      .mockReturnValueOnce('refs/tags/pkg-a@1.0.0\n')
      .mockReturnValueOnce('abcd123\x1ffeat(pkg-a): add x (#12)\x1f* fix(pkg-a): y\n\n* fix(pkg-a): z\x1e\n');

    const commits = new GitService().findManyCommitsSinceTag('pkg-a@1.0.0');

    expect(commits.map((c) => c.toJSON())).toEqual([{ type: 'feat', scope: 'pkg-a', subject: 'add x (#12)', isBreaking: false, hash: 'abcd123' }]);
  });

  it('given a squash commit when a squash pattern is given then it is replaced by its squashed commits', () => {
    vi.mocked(execSync)
      .mockReturnValueOnce('refs/tags/pkg-a@1.0.0\n')
      .mockReturnValueOnce(
        [
          'abcd123\x1ffeat(pkg-a): add x (#12)\x1f* feat(pkg-a)!: new api\n\nbody text\n\n* fix(pkg-b): y\n\nCo-authored-by: someone\x1e',
          'ef01234\x1ffix(pkg-a): plain commit\x1f\x1e',
          '5678abc\x1ffix(pkg-a): single-commit PR (#13)\x1fno bullets here\x1e',
        ].join('\n'),
      );

    const commits = new GitService().findManyCommitsSinceTag('pkg-a@1.0.0', SquashCommitPattern.fromConfig('github'));

    expect(commits.map((c) => [c.hash, c.type, c.scope, c.subject, c.isBreaking])).toEqual([
      ['abcd123', 'feat', 'pkg-a', 'new api', true],
      ['abcd123', 'fix', 'pkg-b', 'y', false],
      ['ef01234', 'fix', 'pkg-a', 'plain commit', false],
      ['5678abc', 'fix', 'pkg-a', 'single-commit PR (#13)', false],
    ]);
  });

  it('given push with and without tags when push runs then tag push is conditional', () => {
    const service = new GitService();

    service.push(false);
    service.push(true);

    expect(execSync).toHaveBeenNthCalledWith(1, 'git push');
    expect(execSync).toHaveBeenNthCalledWith(2, 'git push');
    expect(execSync).toHaveBeenNthCalledWith(3, 'git push --tags');
  });

  it('given a missing tag when createTag runs then vcs tag command is executed', () => {
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('missing tag');
    });
    const service = new GitService();

    service.createTag('pkg-a@1.0.1');

    expect(execSync).toHaveBeenNthCalledWith(1, 'git rev-parse --verify --quiet refs/tags/pkg-a@1.0.1', { encoding: 'utf-8' });
    expect(execSync).toHaveBeenNthCalledWith(2, 'git tag pkg-a@1.0.1');
  });

  it('given an existing tag when createTag runs then it is skipped without error', () => {
    vi.mocked(execSync).mockReturnValueOnce('refs/tags/pkg-a@1.0.1\n');
    const service = new GitService();

    service.createTag('pkg-a@1.0.1');

    expect(execSync).toHaveBeenCalledTimes(1);
    expect(execSync).toHaveBeenCalledWith('git rev-parse --verify --quiet refs/tags/pkg-a@1.0.1', { encoding: 'utf-8' });
  });

  it('given vcs status output when checking tree cleanliness then it returns true only for empty status', () => {
    vi.mocked(execSync).mockReturnValueOnce('').mockReturnValueOnce(' M package.json\n');
    const service = new GitService();

    expect(service.isWorkingTreeClean()).toBe(true);
    expect(service.isWorkingTreeClean()).toBe(false);
    expect(execSync).toHaveBeenNthCalledWith(1, 'git status --porcelain', { encoding: 'utf-8' });
    expect(execSync).toHaveBeenNthCalledWith(2, 'git status --porcelain', { encoding: 'utf-8' });
  });
});

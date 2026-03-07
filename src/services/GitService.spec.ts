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

  it('given a commit message when commit runs then git hook output is streamed to the terminal', () => {
    const service = new GitService();

    service.commit('ci(release): publish [skip-ci]\n\nbody');

    expect(execSync).toHaveBeenNthCalledWith(1, 'git add .');
    expect(execSync).toHaveBeenNthCalledWith(2, 'git commit --allow-empty -F -', {
      input: 'ci(release): publish [skip-ci]\n\nbody',
      stdio: ['pipe', 'inherit', 'inherit'],
    });
  });
});

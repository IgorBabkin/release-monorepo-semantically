import { describe, expect, it, vi } from 'vitest';
import { GitPlugin } from './GitPlugin';
import { NpmPackage } from '../models/NpmPackage';

describe('GitPlugin', () => {
  it('given dry run when release completes then no git actions are executed', () => {
    const vcs = {
      commit: vi.fn(),
      createTag: vi.fn(),
      push: vi.fn(),
    };
    const releaseCommitView = {
      render: vi.fn().mockReturnValue('release commit message'),
    };
    const logger = {
      info: vi.fn(),
    };
    const plugin = new GitPlugin(vcs as never, releaseCommitView as never, logger as never);

    plugin.onReleaseComplete?.({
      dryRun: true,
      noPush: false,
      noPublish: false,
      releasedPackages: [],
      releasedVersions: new Map(),
      releasedCommits: new Map(),
    });

    expect(releaseCommitView.render).not.toHaveBeenCalled();
    expect(vcs.commit).not.toHaveBeenCalled();
    expect(vcs.createTag).not.toHaveBeenCalled();
    expect(vcs.push).not.toHaveBeenCalled();
  });

  it('given no push option when release completes then commit and tags are created but push is skipped', () => {
    const vcs = {
      commit: vi.fn(),
      createTag: vi.fn(),
      push: vi.fn(),
    };
    const releaseCommitView = {
      render: vi.fn().mockReturnValue('release commit message'),
    };
    const logger = {
      info: vi.fn(),
    };
    const plugin = new GitPlugin(vcs as never, releaseCommitView as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.onReleaseComplete?.({
      dryRun: false,
      noPush: true,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(vcs.commit).toHaveBeenCalledWith('release commit message');
    expect(vcs.createTag).toHaveBeenCalledWith('pkg-a@1.0.1');
    expect(vcs.push).not.toHaveBeenCalled();
  });
});

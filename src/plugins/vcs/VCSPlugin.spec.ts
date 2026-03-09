import { describe, expect, it, vi } from 'vitest';
import { VCSPlugin } from './VCSPlugin';
import { NpmPackage } from '../../models/NpmPackage';

describe('GitPlugin', () => {
  it('given dry run when release completes then no vcs actions are executed', () => {
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
    const plugin = new VCSPlugin(vcs as never, releaseCommitView as never, logger as never);

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
    expect(logger.info).toHaveBeenCalledWith('SKIP     vcs commit/tag/push (dry-run)');
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
    const plugin = new VCSPlugin(vcs as never, releaseCommitView as never, logger as never);
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

  it('given released package when release completes then it commits, creates tags and pushes', () => {
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
    const plugin = new VCSPlugin(vcs as never, releaseCommitView as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const releasedVersions = new Map([['pkg-a', '1.0.1']]);
    const context = {
      dryRun: false,
      noPush: false,
      noPublish: true,
      releasedPackages: [pkg],
      releasedVersions,
      releasedCommits: new Map([['pkg-a', []]]),
    };

    plugin.onReleaseComplete?.(context);

    expect(releaseCommitView.render).toHaveBeenCalledWith(context);
    expect(vcs.commit).toHaveBeenCalledWith('release commit message');
    expect(vcs.createTag).toHaveBeenCalledWith('pkg-a@1.0.1');
    expect(vcs.push).toHaveBeenCalledWith(true);
    expect(logger.info).toHaveBeenCalledWith('TAG      pkg-a@1.0.1');
    expect(logger.info).toHaveBeenCalledWith('PUSH     HEAD and 1 tag(s)');
  });
});

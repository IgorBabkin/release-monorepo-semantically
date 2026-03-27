import { describe, expect, it, vi } from 'vitest';
import { VCSPlugin } from './VCSPlugin';
import { NpmPackage } from '../../models/NpmPackage';

describe('GitPlugin', () => {
  it('given a clean working tree when release completes then commit, tags, and push are executed', () => {
    const config = {
      dryRun: false,
      template: 'templates/custom-release.hbs',
    };
    const vcs = {
      isWorkingTreeClean: vi.fn().mockReturnValue(true),
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
    const plugin = new VCSPlugin(config as never, '/repo' as never, vcs as never, releaseCommitView as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const context = {
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    };

    plugin.commitChanges(context);
    plugin.createTags(context);
    plugin.pushChanges(context);

    expect(releaseCommitView.render).toHaveBeenCalledWith('templates/custom-release.hbs', context, { cwd: '/repo' });
    expect(vcs.commit).toHaveBeenCalledWith('release commit message');
    expect(vcs.createTag).toHaveBeenCalledWith('pkg-a@1.0.1');
    expect(vcs.push).toHaveBeenCalledWith(true);
    expect(logger.info).toHaveBeenCalledWith('TAG      pkg-a@1.0.1');
    expect(logger.info).toHaveBeenCalledWith('PUSH     HEAD and 1 tag(s)');
  });
});

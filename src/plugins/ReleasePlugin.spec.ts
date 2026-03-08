import { describe, expect, it, vi } from 'vitest';
import { ChangelogPlugin } from './ChangelogPlugin';
import { GitPlugin } from './GitPlugin';
import { NpmPlugin } from './NpmPlugin';
import { ConventionalCommit } from '../models/ConventionalCommit';
import { NpmPackage } from '../models/NpmPackage';

describe('ChangelogPlugin', () => {
  it('given released package data when plugin runs then it renders changelog and logs write step', () => {
    const view = {
      render: vi.fn().mockReturnValue('# changelog\n'),
    };
    const fs = {
      fileExists: vi.fn().mockReturnValue(false),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new ChangelogPlugin('CHANGELOG.md', view as never, fs as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const commit = ConventionalCommit.parse('fix(pkg-a): patch');
    const releasedVersions = new Map([['pkg-a', '1.0.1']]);

    plugin.onPackageReleased?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      pkg,
      releasedVersions,
      releasedPackages: [pkg],
      releasedCommits: [commit],
    });

    expect(view.render).toHaveBeenCalledWith({
      pkg,
      releasedPackages: [pkg],
      releasedVersions,
      releasedCommits: [commit],
      existing: '',
    });
    expect(fs.writeFile).toHaveBeenCalledWith('/repo/packages/pkg-a/CHANGELOG.md', '# changelog\n');
    expect(logger.info).toHaveBeenCalledWith('WRITE    pkg-a CHANGELOG.md');
  });
});

describe('GitPlugin', () => {
  it('given released packages when plugin finalizes release then it commits, tags and pushes', () => {
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
    const releasedVersions = new Map([['pkg-a', '1.0.1']]);

    plugin.onReleaseComplete?.({
      dryRun: false,
      noPush: false,
      noPublish: true,
      releasedPackages: [pkg],
      releasedVersions,
      releasedCommits: new Map([['pkg-a', []]]),
    });

    expect(releaseCommitView.render).toHaveBeenCalledWith({
      dryRun: false,
      noPush: false,
      noPublish: true,
      releasedPackages: [pkg],
      releasedVersions,
      releasedCommits: new Map([['pkg-a', []]]),
    });
    expect(vcs.commit).toHaveBeenCalledWith('release commit message');
    expect(vcs.createTag).toHaveBeenCalledWith('pkg-a@1.0.1');
    expect(vcs.push).toHaveBeenCalledWith(true);
    expect(logger.info).toHaveBeenCalledWith('TAG      pkg-a@1.0.1');
    expect(logger.info).toHaveBeenCalledWith('PUSH     HEAD and 1 tag(s)');
  });
});

describe('NpmPlugin', () => {
  it('given noPublish is true when plugin finalizes release then it publishes every released package', () => {
    const packageManager = {
      bumpVersion: vi.fn(),
      publish: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new NpmPlugin(packageManager as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.onReleaseComplete?.({
      dryRun: false,
      noPush: true,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(packageManager.publish).toHaveBeenCalledWith('/repo/packages/pkg-a');
    expect(logger.info).toHaveBeenCalledWith('PUBLISH  pkg-a@1.0.1');
  });
});

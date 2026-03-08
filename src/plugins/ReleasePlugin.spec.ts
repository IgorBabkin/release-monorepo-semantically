import { describe, expect, it, vi } from 'vitest';
import { ChangelogPlugin } from './ChangelogPlugin';
import { GitPlugin } from './GitPlugin';
import { NpmPlugin } from './NpmPlugin';
import { ConventionalCommit } from '../models/ConventionalCommit';
import { NpmPackage } from '../models/NpmPackage';

describe('ChangelogPlugin', () => {
  it('given released package data when plugin runs then it renders changelog and logs write step', () => {
    const changelog = {
      addLog: vi.fn(),
      render: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new ChangelogPlugin(changelog as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a/package.json');
    const commit = ConventionalCommit.parse('fix(pkg-a): patch');

    plugin.onPackageReleased?.({
      pkg,
      previousVersion: '1.0.0',
      version: '1.0.1',
      releaseCommits: [commit],
      dependencyUpdates: [],
    });

    expect(changelog.addLog).toHaveBeenCalledWith(commit);
    expect(changelog.render).toHaveBeenCalledWith({
      packageName: 'pkg-a',
      packageVersion: '1.0.1',
      previousVersion: '1.0.0',
      packagePath: '/repo/packages/pkg-a',
      dependencyUpdates: [],
    });
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
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a/package.json');

    plugin.onReleaseComplete?.({
      noPush: true,
      noPublish: true,
      releasedPackages: [{ pkg, version: '1.0.1' }],
      releaseCommitPackages: [
        {
          name: 'pkg-a',
          version: '1.0.1',
          previousVersion: '1.0.0',
          commits: [],
          dependencyUpdates: [],
        },
      ],
    });

    expect(releaseCommitView.render).toHaveBeenCalledWith({
      packages: [
        {
          name: 'pkg-a',
          version: '1.0.1',
          previousVersion: '1.0.0',
          commits: [],
          dependencyUpdates: [],
        },
      ],
    });
    expect(vcs.commit).toHaveBeenCalledWith('release commit message');
    expect(vcs.createTag).toHaveBeenCalledWith('pkg-a@1.0.1');
    expect(vcs.push).toHaveBeenCalledWith(true);
    expect(logger.info).toHaveBeenCalledWith('COMMIT   release commit message');
    expect(logger.info).toHaveBeenCalledWith('TAG      pkg-a@1.0.1');
    expect(logger.info).toHaveBeenCalledWith('PUSH     HEAD and 1 tag(s)');
  });
});

describe('NpmPlugin', () => {
  it('given publish is enabled when plugin finalizes release then it publishes every released package', () => {
    const packageManager = {
      publish: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new NpmPlugin(packageManager as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a/package.json');

    plugin.onReleaseComplete?.({
      noPush: true,
      noPublish: true,
      releasedPackages: [{ pkg, version: '1.0.1' }],
      releaseCommitPackages: [],
    });

    expect(packageManager.publish).toHaveBeenCalledWith(pkg);
    expect(logger.info).toHaveBeenCalledWith('PUBLISH  pkg-a@1.0.1');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { GithubPlugin } from './GithubPlugin';
import { NpmPackage } from '../models/NpmPackage';
import { ConventionalCommit } from '../models/ConventionalCommit';

describe('GithubPlugin', () => {
  it('given valid env values when plugin is created from env then github release config is normalized and used', () => {
    const github = {
      isCliAvailable: vi.fn().mockReturnValue(true),
      createRelease: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const githubReleaseView = {
      render: vi.fn().mockReturnValue('rendered release notes'),
    };
    const plugin = GithubPlugin.createFromEnv(github as never, logger as never, githubReleaseView as never, {
      GITHUB_ACTIONS: ' true ',
      GITHUB_REPOSITORY: ' acme/repo ',
      GITHUB_TOKEN: ' token ',
    });
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.onReleaseComplete?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(github.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: 'acme/repo',
        token: 'token',
      }),
    );
  });

  it('given invalid env values when plugin is created from env then github releases are skipped', () => {
    const github = {
      isCliAvailable: vi.fn().mockReturnValue(true),
      createRelease: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const githubReleaseView = {
      render: vi.fn(),
    };
    const plugin = GithubPlugin.createFromEnv(github as never, logger as never, githubReleaseView as never, {
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'invalid-repository',
      GITHUB_TOKEN: '   ',
    });
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.onReleaseComplete?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(github.isCliAvailable).not.toHaveBeenCalled();
    expect(github.createRelease).not.toHaveBeenCalled();
    expect(githubReleaseView.render).not.toHaveBeenCalled();
  });

  it('given github actions and released packages when release completes then github releases are created', () => {
    const github = {
      isCliAvailable: vi.fn().mockReturnValue(true),
      createRelease: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const githubReleaseView = {
      render: vi.fn().mockReturnValue('rendered release notes'),
    };
    const plugin = new GithubPlugin(
      github as never,
      logger as never,
      {
        isGithubActions: true,
        repository: 'acme/repo',
        token: 'token',
      },
      githubReleaseView as never,
    );

    const pkg = NpmPackage.createFromPackage(
      {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: {
          'pkg-b': '^1.0.0',
        },
      },
      '/repo/packages/pkg-a',
    );

    plugin.onReleaseComplete?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([
        ['pkg-a', '1.0.1'],
        ['pkg-b', '1.1.0'],
      ]),
      releasedCommits: new Map([['pkg-a', [ConventionalCommit.parse('fix(pkg-a): bug fix')]]]),
    });

    expect(github.isCliAvailable).toHaveBeenCalledTimes(1);
    expect(github.createRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: 'acme/repo',
        token: 'token',
        tagName: 'pkg-a@1.0.1',
        title: 'pkg-a v1.0.1',
        notes: 'rendered release notes',
      }),
    );
    expect(githubReleaseView.render).toHaveBeenCalledWith({
      packageName: 'pkg-a',
      version: '1.0.1',
      commits: [ConventionalCommit.parse('fix(pkg-a): bug fix')],
      dependencyUpdates: [
        {
          packageName: 'pkg-b',
          oldVersion: '^1.0.0',
          newVersion: '1.1.0',
        },
      ],
    });
    expect(logger.info).toHaveBeenCalledWith('RELEASE  pkg-a@1.0.1');
  });

  it('given dry run, no push, or missing github config when release completes then github releases are skipped', () => {
    const github = {
      isCliAvailable: vi.fn().mockReturnValue(true),
      createRelease: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const githubReleaseView = {
      render: vi.fn(),
    };
    const plugin = new GithubPlugin(
      github as never,
      logger as never,
      {
        isGithubActions: true,
        repository: 'acme/repo',
        token: 'token',
      },
      githubReleaseView as never,
    );
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.onReleaseComplete?.({
      dryRun: true,
      noPush: false,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    plugin.onReleaseComplete?.({
      dryRun: false,
      noPush: true,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    const pluginWithMissingConfig = new GithubPlugin(
      github as never,
      logger as never,
      {
        isGithubActions: false,
        repository: undefined,
        token: undefined,
      },
      githubReleaseView as never,
    );
    pluginWithMissingConfig.onReleaseComplete?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(github.createRelease).not.toHaveBeenCalled();
    expect(githubReleaseView.render).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('SKIP     github releases (dry-run)');
  });
});

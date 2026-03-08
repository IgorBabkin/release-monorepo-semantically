import { describe, expect, it, vi } from 'vitest';
import { GithubPlugin } from './GithubPlugin';
import { NpmPackage } from '../models/NpmPackage';
import { ConventionalCommit } from '../models/ConventionalCommit';

describe('GithubPlugin', () => {
  it('given github actions and released packages when release completes then github releases are created', () => {
    const github = {
      isCliAvailable: vi.fn().mockReturnValue(true),
      createRelease: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const plugin = new GithubPlugin(github as never, logger as never, {
      isGithubActions: true,
      repository: 'acme/repo',
      token: 'token',
    });

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
      }),
    );
    const body = (github.createRelease as ReturnType<typeof vi.fn>).mock.calls[0][0].notes as string;
    expect(body).toContain('fix: bug fix');
    expect(body).toContain('update pkg-b from ^1.0.0 to 1.1.0');
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
    const plugin = new GithubPlugin(github as never, logger as never, {
      isGithubActions: true,
      repository: 'acme/repo',
      token: 'token',
    });
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

    const pluginWithMissingConfig = new GithubPlugin(github as never, logger as never, {
      isGithubActions: false,
      repository: undefined,
      token: undefined,
    });
    pluginWithMissingConfig.onReleaseComplete?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(github.createRelease).not.toHaveBeenCalled();
  });
});

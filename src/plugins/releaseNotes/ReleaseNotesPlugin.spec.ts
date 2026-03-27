import { describe, expect, it, vi } from 'vitest';
import { ReleaseNotesPlugin } from './ReleaseNotesPlugin';
import { NpmPackage } from '../../models/NpmPackage';

describe('GithubPlugin', () => {
  it('given released packages when release completes then github releases are created', () => {
    const config = {
      repository: 'acme/repo',
      token: 'token',
      template: 'templates/github-release-notes.hbs',
      dryRun: false,
    };
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
    const plugin = new ReleaseNotesPlugin(config as never, '/repo' as never, github as never, logger as never, githubReleaseView as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.createGithubRelease({
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
    expect(githubReleaseView.render).toHaveBeenCalledWith(
      'templates/github-release-notes.hbs',
      expect.objectContaining({
        releasedPackages: [pkg],
        releasedVersions: new Map([['pkg-a', '1.0.1']]),
      }),
      { cwd: '/repo' },
    );
    expect(logger.info).toHaveBeenCalledWith('RELEASE  pkg-a@1.0.1');
  });

  it('given dry run when release completes then release creation is skipped', () => {
    const config = {
      repository: 'acme/repo',
      token: 'token',
      dryRun: true,
    };
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
    const plugin = new ReleaseNotesPlugin(config as never, '/repo' as never, github as never, logger as never, githubReleaseView as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.createGithubRelease({
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(github.createRelease).not.toHaveBeenCalled();
    expect(githubReleaseView.render).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('SKIP   RELEASE  pkg-a@1.0.1');
  });
});

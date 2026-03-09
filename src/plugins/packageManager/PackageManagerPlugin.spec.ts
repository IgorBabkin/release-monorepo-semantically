import { describe, expect, it, vi } from 'vitest';
import { PackageManagerPlugin } from './PackageManagerPlugin';
import { NpmPackage } from '../../models/NpmPackage';

describe('PackageManagerPlugin', () => {
  it('given package release when onPackageReleased runs then version is bumped in package directory', () => {
    const packageManager = {
      bumpVersion: vi.fn(),
      publish: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new PackageManagerPlugin(packageManager as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.onPackageReleased?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      pkg,
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [pkg],
      releasedCommits: [],
    });

    expect(packageManager.bumpVersion).toHaveBeenCalledWith('/repo/packages/pkg-a', '1.0.1');
  });

  it('given dry run when onPackageReleased runs then version bump is skipped', () => {
    const packageManager = {
      bumpVersion: vi.fn(),
      publish: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const plugin = new PackageManagerPlugin(packageManager as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.onPackageReleased?.({
      dryRun: true,
      noPush: false,
      noPublish: false,
      pkg,
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [pkg],
      releasedCommits: [],
    });

    expect(packageManager.bumpVersion).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('SKIP     pkg-a version bump (dry-run)');
  });

  it('given dry run or noPublish when release completes then package publish is skipped', () => {
    const packageManager = {
      bumpVersion: vi.fn(),
      publish: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new PackageManagerPlugin(packageManager as never, logger as never);
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
      noPush: false,
      noPublish: true,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(packageManager.publish).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('SKIP     packageManager publish (dry-run)');
  });

  it('given released packages when publishing is enabled then each package is published', () => {
    const packageManager = {
      bumpVersion: vi.fn(),
      publish: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const plugin = new PackageManagerPlugin(packageManager as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.onReleaseComplete?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: new Map(),
    });

    expect(packageManager.publish).toHaveBeenCalledWith('/repo/packages/pkg-a');
    expect(logger.info).toHaveBeenCalledWith('PUBLISH  pkg-a@1.0.1');
  });
});

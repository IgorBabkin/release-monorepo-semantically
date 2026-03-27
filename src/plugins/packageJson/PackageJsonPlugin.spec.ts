import { describe, expect, it, vi } from 'vitest';
import { PackageJsonPlugin } from './PackageJsonPlugin';
import { NpmPackage } from '../../models/NpmPackage';

describe('PackageJsonPlugin', () => {
  it('given dry run when package is released then package.json rewrite is skipped', () => {
    const config = { dryRun: true };
    const fileSystemService = {
      readPackageJsonOrFail: vi.fn().mockReturnValue({
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'pkg-b': '^1.0.0' },
      }),
      writeToPackageJsonOrFail: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const plugin = new PackageJsonPlugin(config as never, fileSystemService as never, logger as never);
    const pkg = NpmPackage.createFromPackage(
      {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'pkg-b': '^1.0.0' },
      },
      '/repo/packages/pkg-a',
    );

    plugin.updateDependencies({
      pkg,
      releasedVersions: new Map([['pkg-b', '1.1.0']]),
      releasedPackages: [pkg],
      releasedCommits: [],
    });

    expect(fileSystemService.readPackageJsonOrFail).toHaveBeenCalledWith('/repo/packages/pkg-a');
    expect(fileSystemService.writeToPackageJsonOrFail).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('BUMP     pkg-b@1.1.0');
    expect(logger.info).toHaveBeenCalledWith('SKIP     SAVE pkg-a package.json (dry-run)');
  });

  it('given dependency version updates when package is released then package.json is rewritten and logged', () => {
    const config = { dryRun: false };
    const fileSystemService = {
      readPackageJsonOrFail: vi.fn().mockReturnValue({
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'pkg-b': '^1.0.0' },
      }),
      writeToPackageJsonOrFail: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new PackageJsonPlugin(config as never, fileSystemService as never, logger as never);
    const pkg = NpmPackage.createFromPackage(
      {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'pkg-b': '^1.0.0' },
      },
      '/repo/packages/pkg-a',
    );

    plugin.updateDependencies({
      pkg,
      releasedVersions: new Map([['pkg-b', '1.1.0']]),
      releasedPackages: [pkg],
      releasedCommits: [],
    });

    expect(fileSystemService.readPackageJsonOrFail).toHaveBeenCalledWith('/repo/packages/pkg-a');
    expect(fileSystemService.writeToPackageJsonOrFail).toHaveBeenCalledWith('/repo/packages/pkg-a', {
      name: 'pkg-a',
      version: '1.0.0',
      dependencies: { 'pkg-b': '1.1.0' },
    });
    expect(logger.info).toHaveBeenCalledWith('SAVE    pkg-a package.json');
  });

  it('given no dependency changes when package is released then package.json is not rewritten', () => {
    const config = { dryRun: false };
    const fileSystemService = {
      readPackageJsonOrFail: vi.fn(),
      writeToPackageJsonOrFail: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new PackageJsonPlugin(config as never, fileSystemService as never, logger as never);
    const pkg = NpmPackage.createFromPackage(
      {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'pkg-b': '1.0.0' },
      },
      '/repo/packages/pkg-a',
    );

    plugin.updateDependencies({
      pkg,
      releasedVersions: new Map([['pkg-b', '1.0.0']]),
      releasedPackages: [pkg],
      releasedCommits: [],
    });

    expect(fileSystemService.readPackageJsonOrFail).not.toHaveBeenCalled();
    expect(fileSystemService.writeToPackageJsonOrFail).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });
});

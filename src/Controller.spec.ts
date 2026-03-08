import { describe, expect, it, vi } from 'vitest';
import { Controller } from './Controller';
import { NpmPackage } from './models/NpmPackage';
import { ConventionalCommit } from './models/ConventionalCommit';
import { ReleasePlugin } from './plugins/ReleasePlugin';
import { DirtyWorkingTreeException } from './exceptions/DomainException';

describe('MonorepoController.discoverPackages', () => {
  it('given workspace package json files when packages are discovered then private packages are excluded', () => {
    const fs = {
      readPackageJsonOrFail: vi.fn().mockReturnValue({ workspaces: ['packages/*'] }),
      findManyPackageJsonByGlob: vi.fn().mockReturnValue([
        ['/repo/packages/a/package.json', { name: 'pkg-a', version: '1.0.0' }],
        ['/repo/packages/private/package.json', { name: 'pkg-private', version: '1.0.0', private: true }],
      ]),
    };

    const controller = new Controller([], fs as never, {} as never, {} as never);

    controller.discoverPackages('/repo');

    expect(fs.readPackageJsonOrFail).toHaveBeenCalledWith('/repo');
    expect(fs.findManyPackageJsonByGlob).toHaveBeenCalledWith(['packages/*'], '/repo');
    expect((controller as unknown as { packageSortedList: NpmPackage[] }).packageSortedList.map((pkg) => pkg.name)).toEqual(['pkg-a']);
  });
});

describe('MonorepoController.release', () => {
  it('given no release-triggering commits when release runs then it logs skip and calls only finalize hook', () => {
    const plugin: ReleasePlugin = {
      onPackageReleased: vi.fn(),
      onReleaseComplete: vi.fn(),
    };
    const vsc = {
      findManyCommitsSinceTag: vi.fn().mockReturnValue([]),
      isWorkingTreeClean: vi.fn().mockReturnValue(true),
    };
    const logger = {
      info: vi.fn(),
    };
    const controller = new Controller([plugin], {} as never, vsc as never, logger as never);

    (controller as unknown as { packageSortedList: NpmPackage[] }).packageSortedList = [
      NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a/package.json'),
    ];

    controller.release();

    expect(plugin.onPackageReleased).not.toHaveBeenCalled();
    expect(plugin.onReleaseComplete).toHaveBeenCalledWith({
      dryRun: false,
      noPush: false,
      noPublish: false,
      releasedVersions: new Map(),
      releasedPackages: [],
      releasedCommits: new Map(),
    });
    expect(logger.info).toHaveBeenCalledWith('SKIP     pkg-a@1.0.0');
  });

  it('given release-triggering commits when release runs then it calls package and finalize plugin hooks with released state', () => {
    const plugin: ReleasePlugin = {
      onPackageReleased: vi.fn(),
      onReleaseComplete: vi.fn(),
    };
    const vsc = {
      findManyCommitsSinceTag: vi
        .fn()
        .mockImplementation((tag: string) =>
          tag === 'pkg-a@1.0.0' ? [ConventionalCommit.parse('feat(pkg-a): add feature')] : [ConventionalCommit.parse('fix(pkg-b): resolve bug')],
        ),
      isWorkingTreeClean: vi.fn().mockReturnValue(true),
    };
    const logger = {
      info: vi.fn(),
    };
    const controller = new Controller([plugin], {} as never, vsc as never, logger as never);

    const pkgA = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a/package.json');
    const pkgB = NpmPackage.createFromPackage({ name: 'pkg-b', version: '2.0.0' }, '/repo/packages/pkg-b/package.json');
    (controller as unknown as { packageSortedList: NpmPackage[] }).packageSortedList = [pkgA, pkgB];

    controller.release({ noPush: true, noPublish: true });

    expect(plugin.onPackageReleased).toHaveBeenCalledTimes(2);
    expect(plugin.onReleaseComplete).toHaveBeenCalledTimes(1);

    const finalizeArg = (plugin.onReleaseComplete as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(finalizeArg.noPush).toBe(true);
    expect(finalizeArg.noPublish).toBe(true);
    expect(finalizeArg.releasedPackages.map((pkg: NpmPackage) => pkg.name)).toEqual(['pkg-a', 'pkg-b']);
    expect(finalizeArg.releasedVersions.get('pkg-a')).toBe('1.1.0');
    expect(finalizeArg.releasedVersions.get('pkg-b')).toBe('2.0.1');
    expect(finalizeArg.releasedCommits.get('pkg-a')).toHaveLength(1);
    expect(finalizeArg.releasedCommits.get('pkg-b')).toHaveLength(1);
  });

  it('given dirty working tree when a non-dry-run release starts then it fails before plugin hooks mutate state', () => {
    const plugin: ReleasePlugin = {
      onPackageReleased: vi.fn(),
      onReleaseComplete: vi.fn(),
    };
    const vsc = {
      findManyCommitsSinceTag: vi.fn().mockReturnValue([ConventionalCommit.parse('fix(pkg-a): patch')]),
      isWorkingTreeClean: vi.fn().mockReturnValue(false),
    };
    const logger = {
      info: vi.fn(),
    };
    const controller = new Controller([plugin], {} as never, vsc as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a/package.json');
    (controller as unknown as { packageSortedList: NpmPackage[] }).packageSortedList = [pkg];

    expect(() => controller.release()).toThrow(DirtyWorkingTreeException);
    expect(plugin.onPackageReleased).not.toHaveBeenCalled();
    expect(plugin.onReleaseComplete).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { Container } from 'ts-ioc-container';
import { Controller } from './Controller';
import { NpmPackage } from './models/NpmPackage';
import { ConventionalCommit } from './models/ConventionalCommit';
import { onPackageReleasedHook, onReleaseCompleteHook, ReleaseCompletePluginContext, ReleasePlugin } from './plugins/ReleasePlugin';
import { execute } from './utils/hooks';

class TestReleasePlugin implements ReleasePlugin {
  priority = 0;
  disabled = false;
  readonly onPackageReleasedSpy = vi.fn();
  readonly onReleaseCompleteSpy = vi.fn();

  @onPackageReleasedHook(execute())
  onPackageReleased(context: unknown) {
    this.onPackageReleasedSpy(context);
  }

  @onReleaseCompleteHook(execute())
  onReleaseComplete(context: ReleaseCompletePluginContext) {
    this.onReleaseCompleteSpy(context);
  }
}

describe('MonorepoController.discoverPackages', () => {
  it('given workspace package json files when packages are discovered then private packages are excluded', () => {
    const fs = {
      readPackageJsonOrFail: vi.fn().mockReturnValue({ workspaces: ['packages/*'] }),
      findManyPackageJsonByGlob: vi.fn().mockReturnValue([
        ['/repo/packages/a/package.json', { name: 'pkg-a', version: '1.0.0' }],
        ['/repo/packages/private/package.json', { name: 'pkg-private', version: '1.0.0', private: true }],
      ]),
    };

    const controller = new Controller([], fs as never, {} as never, {} as never, new Container() as never);

    controller.discoverPackages();

    expect(fs.readPackageJsonOrFail).toHaveBeenCalledWith('./');
    expect(fs.findManyPackageJsonByGlob).toHaveBeenCalledWith(['packages/*']);
    expect((controller as unknown as { publicPackages: NpmPackage[] }).publicPackages.map((pkg) => pkg.name)).toEqual(['pkg-a']);
  });
});

describe('MonorepoController.release', () => {
  it('given no release-triggering commits when release runs then it logs skip and calls only finalize hook', () => {
    const plugin = new TestReleasePlugin();
    const vsc = {
      findManyCommitsSinceTag: vi.fn().mockReturnValue([]),
    };
    const logger = {
      info: vi.fn(),
    };
    const controller = new Controller([plugin], {} as never, vsc as never, logger as never, new Container() as never);

    (controller as unknown as { publicPackages: NpmPackage[] }).publicPackages = [
      NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a/package.json'),
    ];

    controller.release();

    expect(plugin.onPackageReleasedSpy).not.toHaveBeenCalled();
    expect(plugin.onReleaseCompleteSpy).toHaveBeenCalledWith({
      releasedVersions: new Map(),
      releasedPackages: [],
      releasedCommits: new Map(),
    });
    expect(logger.info).toHaveBeenCalledWith('SKIP     pkg-a@1.0.0');
  });

  it('given release-triggering commits when release runs then it calls package and finalize plugin hooks with released state', () => {
    const plugin = new TestReleasePlugin();
    const vsc = {
      findManyCommitsSinceTag: vi
        .fn()
        .mockImplementation((tag: string) =>
          tag === 'pkg-a@1.0.0' ? [ConventionalCommit.parse('feat(pkg-a): add feature')] : [ConventionalCommit.parse('fix(pkg-b): resolve bug')],
        ),
    };
    const logger = {
      info: vi.fn(),
    };
    const controller = new Controller([plugin], {} as never, vsc as never, logger as never, new Container() as never);

    const pkgA = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a/package.json');
    const pkgB = NpmPackage.createFromPackage({ name: 'pkg-b', version: '2.0.0' }, '/repo/packages/pkg-b/package.json');
    (controller as unknown as { publicPackages: NpmPackage[] }).publicPackages = [pkgA, pkgB];

    controller.release();

    expect(plugin.onPackageReleasedSpy).toHaveBeenCalledTimes(2);
    expect(plugin.onReleaseCompleteSpy).toHaveBeenCalledTimes(1);

    const finalizeArg = plugin.onReleaseCompleteSpy.mock.calls[0][0];
    expect(finalizeArg.releasedPackages.map((pkg: NpmPackage) => pkg.name)).toEqual(['pkg-a', 'pkg-b']);
    expect(finalizeArg.releasedVersions.get('pkg-a')).toBe('1.1.0');
    expect(finalizeArg.releasedVersions.get('pkg-b')).toBe('2.0.1');
    expect(finalizeArg.releasedCommits.get('pkg-a')).toHaveLength(1);
    expect(finalizeArg.releasedCommits.get('pkg-b')).toHaveLength(1);
  });
});

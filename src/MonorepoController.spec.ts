import { describe, expect, it, vi } from 'vitest';
import { MonorepoController } from './MonorepoController';
import { PackageJSON } from './models/PackageJSON';
import { NpmPackage } from './models/NpmPackage';
import { ConventionalCommit } from './models/ConventionalCommit';

describe('MonorepoController.discoverPackages', () => {
  it('given directory workspaces when packages are discovered then package.json files are resolved', () => {
    const packageJsonByPath = new Map<string, PackageJSON>([
      [
        '/repo/packages/a/package.json',
        {
          name: 'pkg-a',
          version: '1.0.0',
        },
      ],
      [
        '/repo/packages/b/package.json',
        {
          name: 'pkg-b',
          version: '1.0.0',
        },
      ],
    ]);

    const fileSystemService = {
      findManyByGlob: vi.fn().mockReturnValue(['/repo/packages/a', '/repo/packages/b/package.json']),
      readJson: vi.fn((filePath: string) => packageJsonByPath.get(filePath)),
      fileExists: vi.fn((filePath: string) => packageJsonByPath.has(filePath)),
    };

    const controller = new MonorepoController(fileSystemService as never, {} as never, {} as never, {} as never, {} as never, {} as never);

    (controller as unknown as { rootPackageJson: PackageJSON }).rootPackageJson = {
      name: 'root',
      version: '1.0.0',
      workspaces: ['packages/*'],
    };

    controller.discoverPackages();

    expect(fileSystemService.readJson).toHaveBeenCalledWith('/repo/packages/a/package.json');
    expect(fileSystemService.readJson).toHaveBeenCalledWith('/repo/packages/b/package.json');
    expect((controller as unknown as { packages: Array<{ name: string }> }).packages.map((pkg) => pkg.name)).toEqual(['pkg-a', 'pkg-b']);
  });
});

describe('MonorepoController.release', () => {
  it('given a skipped bump when release runs then changelog is not rendered', () => {
    const fileSystemService = {
      readJson: vi.fn(),
    };
    const vcs = {
      findManyCommitsSinceTag: vi.fn().mockReturnValue([]),
      createTag: vi.fn(),
    };
    const changelog = {
      addLog: vi.fn(),
      render: vi.fn(),
    };
    const releaseCommit = {
      commit: vi.fn(),
    };
    const packageManager = {
      bumpVersion: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const controller = new MonorepoController(
      fileSystemService as never,
      vcs as never,
      changelog as never,
      releaseCommit as never,
      packageManager as never,
      logger as never,
    );

    (controller as unknown as { packages: NpmPackage[] }).packages = [
      NpmPackage.createFromPackage(
        {
          name: 'pkg-a',
          version: '1.0.0',
        },
        '/repo/packages/pkg-a/package.json',
      ),
    ];

    controller.release();

    expect(changelog.render).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('bump(pkg-a) 1.0.0 (skipped)');
    expect(logger.info).not.toHaveBeenCalledWith('changelog(pkg-a) generated');
    expect(releaseCommit.commit).toHaveBeenCalled();
  });

  it('given multiple bumped packages when release runs then release commit receives all package changes', () => {
    const fileSystemService = {
      readJson: vi.fn((filePath: string) => {
        if (filePath === '/repo/packages/pkg-a/package.json') {
          return { name: 'pkg-a', version: '1.0.0' };
        }
        if (filePath === '/repo/packages/pkg-b/package.json') {
          return { name: 'pkg-b', version: '2.0.0' };
        }
        return undefined;
      }),
      writeJson: vi.fn(),
    };
    const vcs = {
      findManyCommitsSinceTag: vi
        .fn()
        .mockImplementation((tag: string) =>
          tag === 'pkg-a@1.0.0' ? [ConventionalCommit.parse('feat(pkg-a): add feature')] : [ConventionalCommit.parse('fix(pkg-b): resolve bug')],
        ),
      createTag: vi.fn(),
    };
    const changelog = {
      addLog: vi.fn(),
      render: vi.fn(),
    };
    const releaseCommit = {
      commit: vi.fn(),
    };
    const packageManager = {
      bumpVersion: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const controller = new MonorepoController(
      fileSystemService as never,
      vcs as never,
      changelog as never,
      releaseCommit as never,
      packageManager as never,
      logger as never,
    );

    (controller as unknown as { packages: NpmPackage[] }).packages = [
      NpmPackage.createFromPackage(
        {
          name: 'pkg-a',
          version: '1.0.0',
        },
        '/repo/packages/pkg-a/package.json',
      ),
      NpmPackage.createFromPackage(
        {
          name: 'pkg-b',
          version: '2.0.0',
        },
        '/repo/packages/pkg-b/package.json',
      ),
    ];

    controller.release();

    expect(releaseCommit.commit).toHaveBeenCalledWith({
      packages: [
        {
          name: 'pkg-a',
          version: '1.1.0',
          previousVersion: '1.0.0',
          commits: [{ type: 'feat', subject: 'add feature', isBreaking: false }],
          dependencyUpdates: [],
        },
        {
          name: 'pkg-b',
          version: '2.0.1',
          previousVersion: '2.0.0',
          commits: [{ type: 'fix', subject: 'resolve bug', isBreaking: false }],
          dependencyUpdates: [],
        },
      ],
    });
  });
});

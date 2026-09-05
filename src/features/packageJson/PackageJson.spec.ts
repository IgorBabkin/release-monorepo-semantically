import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { PackageController } from './PackageController.js';
import { NpmPackage } from '../../domain/NpmPackage.js';
import { serializeContext } from '../../domain/ReleaseControllerContext.js';
import { IFileSystemService } from '../../services/NodeFileSystemService.js';
import { ILogger } from '../../services/ConsoleLogger.js';
import { PackageJSON } from '../../domain/PackageJSON.js';
import { PackageManager } from '../packageManager/services/PackageManager.js';

const CWD = '/repo';

function contextOf(pkgJson: PackageJSON, releasedVersions: Map<string, string>): string {
  return serializeContext({
    releasedVersions,
    releasedPackages: [NpmPackage.createFromPackage(pkgJson, '/repo/packages/pkg-a')],
    releasedCommits: new Map(),
  });
}

function fsMock(packageJson: PackageJSON, hasLockfile = false) {
  return new Mock<IFileSystemService>()
    .setup((m) => m.readPackageJsonOrFail(It.IsAny()))
    .returns(packageJson)
    .setup((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()))
    .returns(undefined)
    .setup((m) => m.fileExists(It.IsAny()))
    .returns(hasLockfile);
}

function packageManagerMock() {
  return new Mock<PackageManager>()
    .setup((m) => m.lockfileName)
    .returns('pnpm-lock.yaml')
    .setup((m) => m.refreshLockfile(It.IsAny()))
    .returns(undefined);
}

function loggerMock() {
  return new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);
}

describe('PackageController', () => {
  const releasedVersions = new Map([['pkg-b', '1.1.0']]);

  it('given dry run when package is released then package.json rewrite is skipped', () => {
    const config = { dryRun: true };
    const manifest = { name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '^1.0.0' } };
    const fs = fsMock({ ...manifest });
    const packageManager = packageManagerMock();
    const logger = loggerMock();

    new PackageController(config as never, fs.object(), packageManager.object(), CWD, logger.object()).updateDependencies({
      context: contextOf(manifest, releasedVersions),
      dryRun: config.dryRun,
      verbose: false,
    });

    fs.verify((m) => m.readPackageJsonOrFail('/repo/packages/pkg-a'), Times.Once());
    fs.verify((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()), Times.Never());
    packageManager.verify((m) => m.refreshLockfile(It.IsAny()), Times.Never());
    logger.verify((m) => m.info('BUMP     pkg-b@1.1.0'), Times.Once());
    logger.verify((m) => m.info('SKIP     SAVE     pkg-a package.json (dry-run)'), Times.Once());
  });

  it('given dependency version updates when package is released then package.json is rewritten and logged', () => {
    const config = { dryRun: false };
    const manifest = { name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '^1.0.0' } };
    const fs = fsMock({ ...manifest });
    const logger = loggerMock();

    new PackageController(config as never, fs.object(), packageManagerMock().object(), CWD, logger.object()).updateDependencies({
      context: contextOf(manifest, releasedVersions),
      dryRun: config.dryRun,
      verbose: false,
    });

    fs.verify((m) => m.readPackageJsonOrFail('/repo/packages/pkg-a'), Times.Once());
    fs.verify(
      (m) =>
        m.writeToPackageJsonOrFail(
          '/repo/packages/pkg-a',
          It.Is((v: PackageJSON) => v.dependencies?.['pkg-b'] === '1.1.0'),
        ),
      Times.Once(),
    );
    logger.verify((m) => m.info('SAVE     pkg-a package.json'), Times.Once());
  });

  it('given a dependency declared only as a devDependency then the bump lands there and no dependencies block is created', () => {
    const config = { dryRun: false };
    const manifest = {
      name: 'pkg-a',
      version: '1.0.0',
      peerDependencies: { 'pkg-b': '>=1' },
      devDependencies: { 'pkg-b': '1.0.0', vitest: '4.0.0' },
    };
    const fs = fsMock({ ...manifest });
    const logger = loggerMock();

    new PackageController(config as never, fs.object(), packageManagerMock().object(), CWD, logger.object()).updateDependencies({
      context: contextOf(manifest, releasedVersions),
      dryRun: config.dryRun,
      verbose: false,
    });

    fs.verify(
      (m) =>
        m.writeToPackageJsonOrFail(
          '/repo/packages/pkg-a',
          It.Is((v: PackageJSON) => {
            return (
              v.devDependencies?.['pkg-b'] === '1.1.0' &&
              v.devDependencies?.['vitest'] === '4.0.0' &&
              v.dependencies === undefined &&
              v.peerDependencies?.['pkg-b'] === '>=1'
            );
          }),
        ),
      Times.Once(),
    );
    logger.verify((m) => m.info('BUMP     pkg-b@1.1.0'), Times.Once());
  });

  it('given a dependency declared in both blocks then both declarations are refreshed', () => {
    const config = { dryRun: false };
    const manifest = { name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '1.0.0' }, devDependencies: { 'pkg-b': '^1.0.0' } };
    const fs = fsMock({ ...manifest });

    new PackageController(config as never, fs.object(), packageManagerMock().object(), CWD, loggerMock().object()).updateDependencies({
      context: contextOf(manifest, releasedVersions),
      dryRun: config.dryRun,
      verbose: false,
    });

    fs.verify(
      (m) =>
        m.writeToPackageJsonOrFail(
          '/repo/packages/pkg-a',
          It.Is((v: PackageJSON) => v.dependencies?.['pkg-b'] === '1.1.0' && v.devDependencies?.['pkg-b'] === '1.1.0'),
        ),
      Times.Once(),
    );
  });

  it('given a stale devDependency next to an up-to-date dependency then the stale one is still refreshed', () => {
    const config = { dryRun: false };
    const manifest = { name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '1.1.0' }, devDependencies: { 'pkg-b': '1.0.0' } };
    const fs = fsMock({ ...manifest });

    new PackageController(config as never, fs.object(), packageManagerMock().object(), CWD, loggerMock().object()).updateDependencies({
      context: contextOf(manifest, releasedVersions),
      dryRun: config.dryRun,
      verbose: false,
    });

    fs.verify(
      (m) =>
        m.writeToPackageJsonOrFail(
          '/repo/packages/pkg-a',
          It.Is((v: PackageJSON) => v.dependencies?.['pkg-b'] === '1.1.0' && v.devDependencies?.['pkg-b'] === '1.1.0'),
        ),
      Times.Once(),
    );
  });

  it('given a lockfile in the workspace when manifests are rewritten then the lockfile is refreshed', () => {
    const config = { dryRun: false };
    const manifest = { name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '^1.0.0' } };
    const fs = fsMock({ ...manifest }, true);
    const packageManager = packageManagerMock();
    const logger = loggerMock();

    new PackageController(config as never, fs.object(), packageManager.object(), CWD, logger.object()).updateDependencies({
      context: contextOf(manifest, releasedVersions),
      dryRun: config.dryRun,
      verbose: false,
    });

    fs.verify((m) => m.fileExists('pnpm-lock.yaml'), Times.Once());
    packageManager.verify((m) => m.refreshLockfile(CWD), Times.Once());
    logger.verify((m) => m.info('LOCK     pnpm-lock.yaml refreshed'), Times.Once());
  });

  it('given no lockfile in the workspace then none is created', () => {
    const config = { dryRun: false };
    const manifest = { name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '^1.0.0' } };
    const packageManager = packageManagerMock();

    new PackageController(config as never, fsMock({ ...manifest }, false).object(), packageManager.object(), CWD, loggerMock().object()).updateDependencies({
      context: contextOf(manifest, releasedVersions),
      dryRun: config.dryRun,
      verbose: false,
    });

    packageManager.verify((m) => m.refreshLockfile(It.IsAny()), Times.Never());
  });

  it('given no dependency changes when package is released then package.json is not rewritten', () => {
    const manifest = { name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '1.0.0' } };
    const config = { dryRun: false };
    const fs = fsMock({ ...manifest }, true);
    const packageManager = packageManagerMock();
    const logger = loggerMock();

    new PackageController(config as never, fs.object(), packageManager.object(), CWD, logger.object()).updateDependencies({
      context: contextOf(manifest, new Map([['pkg-b', '1.0.0']])),
      dryRun: config.dryRun,
      verbose: false,
    });

    fs.verify((m) => m.readPackageJsonOrFail(It.IsAny()), Times.Never());
    fs.verify((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()), Times.Never());
    packageManager.verify((m) => m.refreshLockfile(It.IsAny()), Times.Never());
    logger.verify((m) => m.info(It.IsAny()), Times.Never());
  });

  it('given --verbose when a dependency is rewritten then the affected package, block and both versions are reported', () => {
    const config = { dryRun: true };
    const manifest = { name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '^1.0.0' } };
    const fs = fsMock({ ...manifest });
    const logger = loggerMock();

    new PackageController(config as never, fs.object(), packageManagerMock().object(), CWD, logger.object()).updateDependencies({
      context: contextOf(
        manifest,
        new Map([
          ['pkg-a', '1.0.1'],
          ['pkg-b', '1.1.0'],
        ]),
      ),
      dryRun: config.dryRun,
      verbose: true,
    });

    logger.verify((m) => m.info('PLAN     pkg-a 1.0.0 -> 1.0.1 (patch, 0 commit(s), deps: pkg-b@1.1.0)'), Times.Once());
    logger.verify((m) => m.info('DEPS     pkg-a pkg-b ^1.0.0 -> 1.1.0 in dependencies'), Times.Once());
  });
});

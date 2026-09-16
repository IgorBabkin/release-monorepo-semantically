import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { PackageManagerController } from './PackageManagerController.js';
import { NpmPackage } from '../../domain/NpmPackage.js';
import { serializeContext } from '../../domain/ReleaseControllerContext.js';
import { PackageManager } from './services/PackageManager.js';
import { ILogger } from '../../services/ConsoleLogger.js';
import { IFileSystemService } from '../../services/NodeFileSystemService.js';
import { PackageJSON } from '../../domain/PackageJSON.js';

describe('PackageManagerController', () => {
  const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
  const releasedVersions = new Map([['pkg-a', '1.0.1']]);
  const context = serializeContext({
    releasedVersions,
    releasedPackages: [pkg],
    releasedCommits: new Map(),
  });

  const manifest = (): PackageJSON => ({ name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '2.0.0' } });

  it('given package release when bumpVersion runs then version is written to the package manifest', () => {
    const config = { dryRun: false };
    const packageManager = new Mock<PackageManager>().object();
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.readPackageJsonOrFail(It.IsAny()))
      .returns(manifest())
      .setup((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageManagerController(config as never, packageManager, fs.object(), logger.object()).bumpVersion({ context, dryRun: config.dryRun });

    // The rest of the manifest rides along untouched: the bump is one field.
    fs.verify(
      (m) =>
        m.writeToPackageJsonOrFail(
          '/repo/packages/pkg-a',
          It.Is<PackageJSON>((written) => written.version === '1.0.1' && written.name === 'pkg-a' && written.dependencies?.['pkg-b'] === '2.0.0'),
        ),
      Times.Once(),
    );
    logger.verify((m) => m.info('BUMP     pkg-a@1.0.1'), Times.Once());
  });

  it('given dry run when bumpVersion runs then version bump is skipped', () => {
    const config = { dryRun: true };
    const packageManager = new Mock<PackageManager>().object();
    const fs = new Mock<IFileSystemService>().setup((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny())).returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageManagerController(config as never, packageManager, fs.object(), logger.object()).bumpVersion({ context, dryRun: config.dryRun });

    fs.verify((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()), Times.Never());
    logger.verify((m) => m.info('SKIP     BUMP     pkg-a@1.0.1 (dry-run)'), Times.Once());
  });

  it('given dry run when publishAllPackages runs then package publish is skipped', () => {
    const config = { dryRun: true };
    const packageManager = new Mock<PackageManager>().setup((m) => m.publish(It.IsAny())).returns(undefined);
    const fs = new Mock<IFileSystemService>().object();
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageManagerController(config as never, packageManager.object(), fs, logger.object()).publishAllPackages({ context, dryRun: config.dryRun });

    packageManager.verify((m) => m.publish(It.IsAny()), Times.Never());
    logger.verify((m) => m.info('SKIP     PUBLISH  pkg-a@1.0.1 (dry-run)'), Times.Once());
  });

  it('given released packages when publishing is enabled then each package is published', () => {
    const config = { dryRun: false };
    const packageManager = new Mock<PackageManager>().setup((m) => m.publish(It.IsAny())).returns(undefined);
    const fs = new Mock<IFileSystemService>().object();
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageManagerController(config as never, packageManager.object(), fs, logger.object()).publishAllPackages({ context, dryRun: config.dryRun });

    packageManager.verify((m) => m.publish('/repo/packages/pkg-a'), Times.Once());
    logger.verify((m) => m.info('PUBLISH  pkg-a@1.0.1'), Times.Once());
  });
});

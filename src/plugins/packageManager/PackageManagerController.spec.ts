import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { PackageManagerController } from './PackageManagerController';
import { NpmPackage } from '../../models/NpmPackage';
import { serializeContext } from '../../models/ReleaseControllerContext';
import { PackageManager } from './services/PackageManager';
import { ILogger } from '../../services/ConsoleLogger';

describe('PackageManagerController', () => {
  const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
  const releasedVersions = new Map([['pkg-a', '1.0.1']]);
  const context = serializeContext({
    releasedVersions,
    releasedPackages: [pkg],
    releasedCommits: new Map(),
  });

  it('given package release when bumpVersion runs then version is bumped in package directory', () => {
    const config = { dryRun: false };
    const packageManager = new Mock<PackageManager>().setup((m) => m.bumpVersion(It.IsAny(), It.IsAny())).returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageManagerController(config as never, packageManager.object(), logger.object()).bumpVersion({ context });

    packageManager.verify((m) => m.bumpVersion('/repo/packages/pkg-a', '1.0.1'), Times.Once());
    logger.verify((m) => m.info('BUMP     pkg-a@1.0.1'), Times.Once());
  });

  it('given dry run when bumpVersion runs then version bump is skipped', () => {
    const config = { dryRun: true };
    const packageManager = new Mock<PackageManager>().setup((m) => m.bumpVersion(It.IsAny(), It.IsAny())).returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageManagerController(config as never, packageManager.object(), logger.object()).bumpVersion({ context });

    packageManager.verify((m) => m.bumpVersion(It.IsAny(), It.IsAny()), Times.Never());
    logger.verify((m) => m.info('SKIP     BUMP     pkg-a@1.0.1 (dry-run)'), Times.Once());
  });

  it('given dry run when publishAllPackages runs then package publish is skipped', () => {
    const config = { dryRun: true };
    const packageManager = new Mock<PackageManager>().setup((m) => m.publish(It.IsAny())).returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageManagerController(config as never, packageManager.object(), logger.object()).publishAllPackages({ context });

    packageManager.verify((m) => m.publish(It.IsAny()), Times.Never());
    logger.verify((m) => m.info('SKIP     PUBLISH      pkg-a@1.0.1 (dry-run)'), Times.Once());
  });

  it('given released packages when publishing is enabled then each package is published', () => {
    const config = { dryRun: false };
    const packageManager = new Mock<PackageManager>().setup((m) => m.publish(It.IsAny())).returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageManagerController(config as never, packageManager.object(), logger.object()).publishAllPackages({ context });

    packageManager.verify((m) => m.publish('/repo/packages/pkg-a'), Times.Once());
    logger.verify((m) => m.info('PUBLISH  pkg-a@1.0.1'), Times.Once());
  });
});

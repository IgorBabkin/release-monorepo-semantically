import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { PackageController } from './PackageController';
import { NpmPackage } from '../../models/NpmPackage';
import { serializeContext } from '../../models/ReleaseControllerContext';
import { IFileSystemService } from '../../services/NodeFileSystemService';
import { ILogger } from '../../services/ConsoleLogger';

describe('PackageController', () => {
  const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '^1.0.0' } }, '/repo/packages/pkg-a');
  const releasedVersions = new Map([['pkg-b', '1.1.0']]);
  const context = serializeContext({
    releasedVersions,
    releasedPackages: [pkg],
    releasedCommits: new Map(),
  });

  it('given dry run when package is released then package.json rewrite is skipped', () => {
    const config = { dryRun: true };
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.readPackageJsonOrFail(It.IsAny()))
      .returns({ name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '^1.0.0' } })
      .setup((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageController(config as never, fs.object(), logger.object()).updateDependencies({ context });

    fs.verify((m) => m.readPackageJsonOrFail('/repo/packages/pkg-a'), Times.Once());
    fs.verify((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()), Times.Never());
    logger.verify((m) => m.info('BUMP     pkg-b@1.1.0'), Times.Once());
    logger.verify((m) => m.info('SKIP     SAVE pkg-a package.json (dry-run)'), Times.Once());
  });

  it('given dependency version updates when package is released then package.json is rewritten and logged', () => {
    const config = { dryRun: false };
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.readPackageJsonOrFail(It.IsAny()))
      .returns({ name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '^1.0.0' } })
      .setup((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageController(config as never, fs.object(), logger.object()).updateDependencies({ context });

    fs.verify((m) => m.readPackageJsonOrFail('/repo/packages/pkg-a'), Times.Once());
    fs.verify(
      (m) =>
        m.writeToPackageJsonOrFail(
          '/repo/packages/pkg-a',
          It.Is((v: { dependencies?: Record<string, string> }) => v.dependencies?.['pkg-b'] === '1.1.0'),
        ),
      Times.Once(),
    );
    logger.verify((m) => m.info('SAVE    pkg-a package.json'), Times.Once());
  });

  it('given no dependency changes when package is released then package.json is not rewritten', () => {
    const pkgNoDeps = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0', dependencies: { 'pkg-b': '1.0.0' } }, '/repo/packages/pkg-a');
    const contextNoDeps = serializeContext({
      releasedVersions: new Map([['pkg-b', '1.0.0']]),
      releasedPackages: [pkgNoDeps],
      releasedCommits: new Map(),
    });
    const config = { dryRun: false };
    const fs = new Mock<IFileSystemService>().setup((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny())).returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new PackageController(config as never, fs.object(), logger.object()).updateDependencies({ context: contextNoDeps });

    fs.verify((m) => m.readPackageJsonOrFail(It.IsAny()), Times.Never());
    fs.verify((m) => m.writeToPackageJsonOrFail(It.IsAny(), It.IsAny()), Times.Never());
    logger.verify((m) => m.info(It.IsAny()), Times.Never());
  });
});

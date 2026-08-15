import { describe, expect, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { IContainer } from 'ts-ioc-container';
import { ReportController, resolvePublicPackages } from './ReportController.js';
import { NpmPackage } from '../../domain/NpmPackage.js';
import { ConventionalCommit } from '../../domain/ConventionalCommit.js';
import { deserializeContext } from '../../domain/ReleaseControllerContext.js';
import { VSCService } from '../vcs/services/VSCService.js';
import { ILogger } from '../../services/ConsoleLogger.js';
import { OutputService } from '../../services/OutputService.js';
import { IFileSystemService } from '../../services/NodeFileSystemService.js';
import { DirtyWorkingTreeException } from '../../exceptions/DomainException.js';

describe('ReportController.generate', () => {
  it('given a dirty working tree when generate runs then it fails before touching anything', () => {
    const vsc = new Mock<VSCService>().setup((m) => m.isWorkingTreeClean()).returns(false);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);
    const output = new Mock<OutputService>();

    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const controller = new ReportController(vsc.object(), logger.object(), output.object(), [pkg]);

    expect(() => controller.generate()).toThrow(DirtyWorkingTreeException);
    output.verify((m) => m.write(It.IsAny()), Times.Never());
  });

  it('given no release-triggering commits when generate runs then packages are skipped and output contains empty context', () => {
    const vsc = new Mock<VSCService>()
      .setup((m) => m.isWorkingTreeClean())
      .returns(true)
      .setup((m) => m.findManyCommitsSinceTag(It.IsAny()))
      .returns([]);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);
    const output = new Mock<OutputService>().setup((m) => m.write(It.IsAny())).returns(undefined);

    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const controller = new ReportController(vsc.object(), logger.object(), output.object(), [pkg]);

    controller.generate();

    logger.verify((m) => m.info('SKIP     pkg-a@1.0.0'), Times.Once());
    output.verify(
      (m) =>
        m.write(
          It.Is((body: string) => {
            const ctx = deserializeContext(body);
            return ctx.releasedPackages.length === 0 && ctx.releasedVersions.size === 0;
          }),
        ),
      Times.Once(),
    );
  });

  it('given release-triggering commits when generate runs then packages are bumped and output contains serialized context', () => {
    const vsc = new Mock<VSCService>()
      .setup((m) => m.isWorkingTreeClean())
      .returns(true)
      .setup((m) => m.findManyCommitsSinceTag('pkg-a@1.0.0'))
      .returns([ConventionalCommit.parse('feat(pkg-a): add feature')])
      .setup((m) => m.findManyCommitsSinceTag('pkg-b@2.0.0'))
      .returns([ConventionalCommit.parse('fix(pkg-b): resolve bug')]);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);
    const output = new Mock<OutputService>().setup((m) => m.write(It.IsAny())).returns(undefined);

    const pkgA = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const pkgB = NpmPackage.createFromPackage({ name: 'pkg-b', version: '2.0.0' }, '/repo/packages/pkg-b');
    const controller = new ReportController(vsc.object(), logger.object(), output.object(), [pkgA, pkgB]);

    controller.generate();

    output.verify(
      (m) =>
        m.write(
          It.Is((body: string) => {
            const ctx = deserializeContext(body);
            return ctx.releasedVersions.get('pkg-a') === '1.1.0' && ctx.releasedVersions.get('pkg-b') === '2.0.1' && ctx.releasedPackages.length === 2;
          }),
        ),
      Times.Once(),
    );
    logger.verify((m) => m.info('BUMP     pkg-a 1.0.0 -> 1.1.0 (minor)'), Times.Once());
    logger.verify((m) => m.info('BUMP     pkg-b 2.0.0 -> 2.0.1 (patch)'), Times.Once());
  });
});

describe('resolvePublicPackages', () => {
  it('given workspace package json files when packages are resolved then private packages are excluded', () => {
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.readPackageJsonOrFail('./'))
      .returns({ name: 'root', version: '1.0.0', workspaces: ['packages/*'] })
      .setup((m) => m.findManyPackageJsonByGlob(It.IsAny()))
      .returns([
        ['/repo/packages/a', { name: 'pkg-a', version: '1.0.0' }],
        ['/repo/packages/private', { name: 'pkg-private', version: '1.0.0', private: true }],
      ]);
    const container = new Mock<IContainer>().setup((c) => c.resolve(It.IsAny(), It.IsAny())).returns(fs.object());

    const packages = resolvePublicPackages(container.object());

    fs.verify((m) => m.readPackageJsonOrFail('./'), Times.Once());
    fs.verify((m) => m.findManyPackageJsonByGlob(It.Is((v: string[]) => JSON.stringify(v) === JSON.stringify(['packages/*']))), Times.Once());
    expect(packages.map((p) => p.name)).toEqual(['pkg-a']);
  });
});

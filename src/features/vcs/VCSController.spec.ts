import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { VCSController } from './VCSController.js';
import { NpmPackage } from '../../domain/NpmPackage.js';
import { serializeContext } from '../../domain/ReleaseControllerContext.js';
import { VSCService } from './services/VSCService.js';
import { IRenderService } from '../../services/HandlebarsRenderService.js';
import { ILogger } from '../../services/ConsoleLogger.js';

describe('VCSController', () => {
  const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
  const releasedVersions = new Map([['pkg-a', '1.0.1']]);
  const context = serializeContext({
    releasedVersions,
    releasedPackages: [pkg],
    releasedCommits: new Map(),
  });

  it('given a clean working tree when release completes then commit, tags, and push are executed', () => {
    const config = {
      dryRun: false,
      template: 'templates/custom-release.hbs',
    };
    const vcs = new Mock<VSCService>()
      .setup((m) => m.isWorkingTreeClean())
      .returns(true)
      .setup((m) => m.commit(It.IsAny()))
      .returns(undefined)
      .setup((m) => m.createTag(It.IsAny()))
      .returns(undefined)
      .setup((m) => m.push(It.IsAny()))
      .returns(undefined);
    const renderService = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny())).returns('release commit message');
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    const controller = new VCSController(config as never, '/repo', vcs.object(), renderService.object(), logger.object());
    controller.commitChanges({ context, dryRun: config.dryRun, verbose: false });
    controller.createTags({ context, dryRun: config.dryRun, verbose: false });
    controller.pushChanges({ context, dryRun: config.dryRun, verbose: false });

    renderService.verify(
      (m) =>
        m.render(
          'templates/custom-release.hbs',
          It.IsAny(),
          It.Is((opts: { cwd: string }) => opts.cwd === '/repo'),
        ),
      Times.Once(),
    );
    vcs.verify((m) => m.commit('release commit message'), Times.Once());
    vcs.verify((m) => m.createTag('pkg-a@1.0.1'), Times.Once());
    vcs.verify((m) => m.push(true), Times.Once());
    logger.verify((m) => m.info('TAG      pkg-a@1.0.1'), Times.Once());
    logger.verify((m) => m.info('PUSH     HEAD and 1 tag(s)'), Times.Once());
  });

  it('given --verbose when the default action runs commit, tag and push then the release plan is reported once', () => {
    const config = { dryRun: true, template: undefined };
    const vcs = new Mock<VSCService>().setup((m) => m.isWorkingTreeClean()).returns(true);
    const renderService = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny())).returns('release commit message');
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    const controller = new VCSController(config as never, '/repo', vcs.object(), renderService.object(), logger.object());
    controller.commitChanges({ context, dryRun: config.dryRun, verbose: true });
    controller.createTags({ context, dryRun: config.dryRun, verbose: true });
    controller.pushChanges({ context, dryRun: config.dryRun, verbose: true });

    logger.verify((m) => m.info('PLAN     1 package(s) affected'), Times.Once());
    logger.verify((m) => m.info('PLAN     pkg-a 1.0.0 -> 1.0.1 (patch, 0 commit(s))'), Times.Once());
  });
});

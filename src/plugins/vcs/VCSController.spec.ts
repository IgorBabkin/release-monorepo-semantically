import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { VCSController } from './VCSController';
import { NpmPackage } from '../../models/NpmPackage';
import { serializeContext } from '../../models/ReleaseControllerContext';
import { VSCService } from './services/VSCService';
import { IRenderService } from '../../services/HandlebarsRenderService';
import { ILogger } from '../../services/ConsoleLogger';

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
    controller.commitChanges({ context });
    controller.createTags({ context });
    controller.pushChanges({ context });

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
});

import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { ReleaseNotesController } from './ReleaseNotesController';
import { NpmPackage } from '../../models/NpmPackage';
import { serializeContext } from '../../models/ReleaseControllerContext';
import { ReleaseNotesService } from './services/ReleaseNotesService';
import { IRenderService } from '../../services/HandlebarsRenderService';
import { ILogger } from '../../services/ConsoleLogger';

describe('ReleaseNotesController', () => {
  const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
  const releasedVersions = new Map([['pkg-a', '1.0.1']]);
  const context = serializeContext({
    releasedVersions,
    releasedPackages: [pkg],
    releasedCommits: new Map(),
  });

  it('given released packages when release completes then github releases are created', () => {
    const config = {
      repository: 'acme/repo',
      token: 'token',
      template: 'templates/github-release-notes.hbs',
      dryRun: false,
    };
    const github = new Mock<ReleaseNotesService>()
      .setup((m) => m.isCliAvailable())
      .returns(true)
      .setup((m) => m.createRelease(It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);
    const renderService = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny())).returns('rendered release notes');

    new ReleaseNotesController(config as never, '/repo', github.object(), logger.object(), renderService.object()).createGithubRelease({ context });

    github.verify((m) => m.isCliAvailable(), Times.Once());
    github.verify(
      (m) =>
        m.createRelease(
          It.Is(
            (arg: { repository: string; token: string; tagName: string; title: string; notes: string }) =>
              arg.repository === 'acme/repo' &&
              arg.token === 'token' &&
              arg.tagName === 'pkg-a@1.0.1' &&
              arg.title === 'pkg-a v1.0.1' &&
              arg.notes === 'rendered release notes',
          ),
        ),
      Times.Once(),
    );
    renderService.verify(
      (m) =>
        m.render(
          'templates/github-release-notes.hbs',
          It.IsAny(),
          It.Is((opts: { cwd: string }) => opts.cwd === '/repo'),
        ),
      Times.Once(),
    );
    logger.verify((m) => m.info('RELEASE  pkg-a@1.0.1'), Times.Once());
  });

  it('given dry run when release completes then release creation is skipped', () => {
    const config = {
      repository: 'acme/repo',
      token: 'token',
      dryRun: true,
    };
    const github = new Mock<ReleaseNotesService>()
      .setup((m) => m.isCliAvailable())
      .returns(true)
      .setup((m) => m.createRelease(It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);
    const renderService = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny())).returns('');

    new ReleaseNotesController(config as never, '/repo', github.object(), logger.object(), renderService.object()).createGithubRelease({ context });

    github.verify((m) => m.createRelease(It.IsAny()), Times.Never());
    renderService.verify((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny()), Times.Never());
    logger.verify((m) => m.info('SKIP   RELEASE  pkg-a@1.0.1'), Times.Once());
  });
});

import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { ChangelogController } from './ChangelogController';
import { NpmPackage } from '../../models/NpmPackage';
import { ConventionalCommit } from '../../models/ConventionalCommit';
import { serializeContext } from '../../models/ReleaseControllerContext';
import { IRenderService } from '../../services/HandlebarsRenderService';
import { IFileSystemService } from '../../services/NodeFileSystemService';
import { ILogger } from '../../services/ConsoleLogger';

describe('ChangelogController', () => {
  const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
  const commits = [ConventionalCommit.parse('fix(pkg-a): patch')];
  const releasedVersions = new Map([['pkg-a', '1.0.1']]);
  const context = serializeContext({
    releasedVersions,
    releasedPackages: [pkg],
    releasedCommits: new Map([['pkg-a', commits]]),
  });

  it('given missing changelog when package is released then empty existing content is passed to view', () => {
    const renderService = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny())).returns('new changelog');
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.fileExists(It.IsAny()))
      .returns(false)
      .setup((m) => m.writeFile(It.IsAny(), It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new ChangelogController('/repo', renderService.object(), fs.object(), logger.object()).generateChangelog({ context });

    renderService.verify(
      (m) =>
        m.render(
          './changelog.hbs',
          It.Is((data: Record<string, unknown>) => data['existing'] === ''),
          It.Is((opts: { cwd: string }) => opts.cwd.includes('src/plugins/changelog')),
        ),
      Times.Once(),
    );
    fs.verify((m) => m.readFile(It.IsAny()), Times.Never());
    fs.verify((m) => m.writeFile('/repo/packages/pkg-a/CHANGELOG.md', 'new changelog'), Times.Once());
    logger.verify((m) => m.info('WRITE    pkg-a CHANGELOG.md'), Times.Once());
  });

  it('given existing changelog when package is released then existing content is passed to view and file is rewritten', () => {
    const renderService = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny())).returns('new changelog');
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.fileExists(It.IsAny()))
      .returns(true)
      .setup((m) => m.readFile(It.IsAny()))
      .returns('old changelog')
      .setup((m) => m.writeFile(It.IsAny(), It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new ChangelogController('/repo', renderService.object(), fs.object(), logger.object()).generateChangelog({ context });

    renderService.verify(
      (m) =>
        m.render(
          './changelog.hbs',
          It.Is((data: Record<string, unknown>) => data['existing'] === 'old changelog'),
          It.Is((opts: { cwd: string }) => opts.cwd.includes('src/plugins/changelog')),
        ),
      Times.Once(),
    );
    fs.verify((m) => m.readFile('/repo/packages/pkg-a/CHANGELOG.md'), Times.Once());
    fs.verify((m) => m.writeFile('/repo/packages/pkg-a/CHANGELOG.md', 'new changelog'), Times.Once());
    logger.verify((m) => m.info('WRITE    pkg-a CHANGELOG.md'), Times.Once());
  });

  it('given changelogName option when package is released then configured changelog filename is used', () => {
    const renderService = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny())).returns('new changelog');
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.fileExists(It.IsAny()))
      .returns(false)
      .setup((m) => m.writeFile(It.IsAny(), It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new ChangelogController('/repo', renderService.object(), fs.object(), logger.object()).generateChangelog({
      changelogName: 'HISTORY.md',
      context,
    });

    fs.verify((m) => m.writeFile('/repo/packages/pkg-a/HISTORY.md', 'new changelog'), Times.Once());
    logger.verify((m) => m.info('WRITE    pkg-a HISTORY.md'), Times.Once());
  });

  it('given custom template when package is released then cwd is resolved from controller cwd', () => {
    const renderService = new Mock<IRenderService>().setup((m) => m.render(It.IsAny(), It.IsAny(), It.IsAny())).returns('new changelog');
    const fs = new Mock<IFileSystemService>()
      .setup((m) => m.fileExists(It.IsAny()))
      .returns(false)
      .setup((m) => m.writeFile(It.IsAny(), It.IsAny()))
      .returns(undefined);
    const logger = new Mock<ILogger>().setup((m) => m.info(It.IsAny())).returns(undefined);

    new ChangelogController('/repo', renderService.object(), fs.object(), logger.object()).generateChangelog({
      template: 'templates/custom.hbs',
      context,
    });

    renderService.verify(
      (m) =>
        m.render(
          'templates/custom.hbs',
          It.IsAny(),
          It.Is((opts: { cwd: string }) => opts.cwd === '/repo'),
        ),
      Times.Once(),
    );
  });
});

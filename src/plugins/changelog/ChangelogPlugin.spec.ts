import { describe, expect, it, vi } from 'vitest';
import { ChangelogPlugin } from './ChangelogPlugin';
import { NpmPackage } from '../../models/NpmPackage';
import { ConventionalCommit } from '../../models/ConventionalCommit';

describe('ChangelogPlugin', () => {
  it('given dry run when package is released then changelog write is skipped', () => {
    const config = { dryRun: true };
    const view = {
      render: vi.fn().mockReturnValue('new changelog'),
    };
    const fs = {
      fileExists: vi.fn().mockReturnValue(true),
      readFile: vi.fn().mockReturnValue('old changelog'),
      writeFile: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };
    const plugin = new ChangelogPlugin(config as never, '/repo' as never, view as never, fs as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.generateChangelog({
      pkg,
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [pkg],
      releasedCommits: [ConventionalCommit.parse('fix(pkg-a): patch')],
    });

    expect(view.render).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('SKIP     pkg-a CHANGELOG.md (dry-run)');
  });

  it('given missing changelog when package is released then empty existing content is passed to view', () => {
    const config = { dryRun: false };
    const view = {
      render: vi.fn().mockReturnValue('new changelog'),
    };
    const fs = {
      fileExists: vi.fn().mockReturnValue(false),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new ChangelogPlugin(config as never, '/repo' as never, view as never, fs as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const commits = [ConventionalCommit.parse('fix(pkg-a): patch')];

    plugin.generateChangelog({
      pkg,
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [pkg],
      releasedCommits: commits,
    });

    expect(view.render).toHaveBeenCalledWith(
      './changelog.hbs',
      {
        pkg,
        releasedPackages: [pkg],
        releasedVersions: new Map([['pkg-a', '1.0.1']]),
        releasedCommits: commits,
        existing: '',
      },
      { cwd: expect.stringContaining('/src/plugins/changelog') },
    );
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith('/repo/packages/pkg-a/CHANGELOG.md', 'new changelog');
    expect(logger.info).toHaveBeenCalledWith('WRITE    pkg-a CHANGELOG.md');
  });

  it('given existing changelog when package is released then existing content is passed to view and file is rewritten', () => {
    const config = { dryRun: false };
    const view = {
      render: vi.fn().mockReturnValue('new changelog'),
    };
    const fs = {
      fileExists: vi.fn().mockReturnValue(true),
      readFile: vi.fn().mockReturnValue('old changelog'),
      writeFile: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new ChangelogPlugin(config as never, '/repo' as never, view as never, fs as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const commits = [ConventionalCommit.parse('fix(pkg-a): patch')];

    plugin.generateChangelog({
      pkg,
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [pkg],
      releasedCommits: commits,
    });

    expect(view.render).toHaveBeenCalledWith(
      './changelog.hbs',
      {
        pkg,
        releasedPackages: [pkg],
        releasedVersions: new Map([['pkg-a', '1.0.1']]),
        releasedCommits: commits,
        existing: 'old changelog',
      },
      { cwd: expect.stringContaining('/src/plugins/changelog') },
    );
    expect(fs.writeFile).toHaveBeenCalledWith('/repo/packages/pkg-a/CHANGELOG.md', 'new changelog');
    expect(logger.info).toHaveBeenCalledWith('WRITE    pkg-a CHANGELOG.md');
  });

  it('given changelogName plugin config when package is released then configured changelog filename is used', () => {
    const config = {
      template: 'templates/custom.hbs',
      changelogName: 'HISTORY.md',
      dryRun: false,
    };
    const view = {
      render: vi.fn().mockReturnValue('new changelog'),
    };
    const fs = {
      fileExists: vi.fn().mockReturnValue(false),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };
    const logger = {
      info: vi.fn(),
    };

    const plugin = new ChangelogPlugin(config as never, '/repo' as never, view as never, fs as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');

    plugin.generateChangelog({
      pkg,
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [pkg],
      releasedCommits: [ConventionalCommit.parse('fix(pkg-a): patch')],
    });

    expect(fs.writeFile).toHaveBeenCalledWith('/repo/packages/pkg-a/HISTORY.md', 'new changelog');
    expect(logger.info).toHaveBeenCalledWith('WRITE    pkg-a HISTORY.md');
  });
});

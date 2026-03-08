import { describe, expect, it, vi } from 'vitest';
import { ChangelogPlugin } from './ChangelogPlugin';
import { NpmPackage } from '../models/NpmPackage';
import { ConventionalCommit } from '../models/ConventionalCommit';

describe('ChangelogPlugin', () => {
  it('given existing changelog when package is released then existing content is passed to view and file is rewritten', () => {
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

    const plugin = new ChangelogPlugin('CHANGELOG.md', view as never, fs as never, logger as never);
    const pkg = NpmPackage.createFromPackage({ name: 'pkg-a', version: '1.0.0' }, '/repo/packages/pkg-a');
    const commits = [ConventionalCommit.parse('fix(pkg-a): patch')];

    plugin.onPackageReleased?.({
      dryRun: false,
      noPush: false,
      noPublish: false,
      pkg,
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [pkg],
      releasedCommits: commits,
    });

    expect(view.render).toHaveBeenCalledWith({
      pkg,
      releasedPackages: [pkg],
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedCommits: commits,
      existing: 'old changelog',
    });
    expect(fs.writeFile).toHaveBeenCalledWith('/repo/packages/pkg-a/CHANGELOG.md', 'new changelog');
    expect(logger.info).toHaveBeenCalledWith('WRITE    pkg-a CHANGELOG.md');
  });
});

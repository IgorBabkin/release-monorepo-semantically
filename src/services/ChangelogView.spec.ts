import { describe, expect, it, vi } from 'vitest';
import { ChangelogView } from './ChangelogView';
import { NpmPackage } from '../models/NpmPackage';
import { ConventionalCommit } from '../models/ConventionalCommit';

describe('ChangelogView', () => {
  it('given released package context when changelog is rendered then entry data is provided for templates', () => {
    const renderService = {
      render: vi.fn().mockReturnValue('rendered'),
    };

    const view = new ChangelogView('templates/custom.hbs', renderService as never);
    const pkg = NpmPackage.createFromPackage(
      {
        name: 'pkg-a',
        version: '1.0.0',
        dependencies: { 'pkg-b': '^1.0.0' },
      },
      '/repo/packages/pkg-a',
    );
    const commits = [
      ConventionalCommit.parse('feat(pkg-a): add feature'),
      ConventionalCommit.parse('fix(pkg-a): fix bug'),
      ConventionalCommit.parse('perf(pkg-a): speed up'),
    ];

    const output = view.render({
      pkg,
      releasedCommits: commits,
      releasedPackages: [pkg],
      releasedVersions: new Map([
        ['pkg-a', '1.1.0'],
        ['pkg-b', '1.1.0'],
      ]),
      existing: 'existing body',
    });

    expect(output).toBe('rendered');
    expect(renderService.render).toHaveBeenCalledWith(
      'templates/custom.hbs',
      expect.objectContaining({
        pkg,
        releasedCommits: commits,
        existing: 'existing body',
        entry: expect.objectContaining({
          version: '1.1.0',
          oldVersion: '1.0.0',
        }),
      }),
    );

    const passedEntry = (renderService.render as ReturnType<typeof vi.fn>).mock.calls[0][1].entry;
    expect(passedEntry.fixes).toHaveLength(1);
    expect(passedEntry.features).toHaveLength(1);
    expect(passedEntry.performance).toHaveLength(1);
    expect(passedEntry.dependencyUpdates).toEqual([
      {
        packageName: 'pkg-b',
        oldVersion: '^1.0.0',
        newVersion: '1.1.0',
      },
    ]);
  });
});

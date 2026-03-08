import { describe, expect, it, vi } from 'vitest';
import { GithubReleaseView } from './GithubReleaseView';
import { ConventionalCommit } from '../models/ConventionalCommit';

describe('GithubReleaseView', () => {
  it('renders release notes through configured template', () => {
    const renderService = {
      render: vi.fn().mockReturnValue('notes'),
    };
    const view = new GithubReleaseView('templates/github-release-notes.hbs', renderService as never);

    const result = view.render({
      packageName: 'pkg-a',
      version: '1.0.1',
      commits: [ConventionalCommit.parse('fix(pkg-a): bug fix')],
      dependencyUpdates: [],
    });

    expect(result).toBe('notes');
    expect(renderService.render).toHaveBeenCalledWith('templates/github-release-notes.hbs', {
      packageName: 'pkg-a',
      version: '1.0.1',
      commits: [ConventionalCommit.parse('fix(pkg-a): bug fix')],
      dependencyUpdates: [],
    });
  });
});

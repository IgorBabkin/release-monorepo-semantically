import { describe, expect, it, vi } from 'vitest';
import { ReleaseCommitView, DEFAULT_RELEASE_COMMIT_TEMPLATE } from './ReleaseCommitView';

describe('ReleaseCommitView', () => {
  it('given no template override when rendering then default release commit template is used', () => {
    const renderService = {
      render: vi.fn().mockReturnValue('commit body'),
    };
    const view = new ReleaseCommitView(undefined, renderService as never);
    const context = {
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [],
      releasedCommits: new Map(),
    };

    const result = view.render(context);

    expect(result).toBe('commit body');
    expect(renderService.render).toHaveBeenCalledWith(DEFAULT_RELEASE_COMMIT_TEMPLATE, context);
  });

  it('given template override when rendering then custom template path is used', () => {
    const renderService = {
      render: vi.fn().mockReturnValue('custom commit body'),
    };
    const view = new ReleaseCommitView('templates/custom-release.hbs', renderService as never);
    const context = {
      releasedVersions: new Map([['pkg-a', '1.0.1']]),
      releasedPackages: [],
      releasedCommits: new Map(),
    };

    const result = view.render(context);

    expect(result).toBe('custom commit body');
    expect(renderService.render).toHaveBeenCalledWith('templates/custom-release.hbs', context);
  });
});

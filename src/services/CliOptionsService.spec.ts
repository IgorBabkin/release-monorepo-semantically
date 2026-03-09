import { describe, expect, it } from 'vitest';
import { CliOptionsService } from './CliOptionsService';

describe('CliOptionsService', () => {
  it('given --help when options are parsed then help mode is returned', () => {
    const service = new CliOptionsService();

    expect(service.parse(['--help'])).toEqual({
      help: true,
      dryRun: false,
      noPush: false,
      noPublish: false,
    });
  });

  it('given no push or publish flags when options are parsed then vcs push and package publish are disabled', () => {
    const service = new CliOptionsService();

    expect(service.parse(['--no-push', '--no-publish'])).toEqual({
      dryRun: false,
      help: false,
      noPush: true,
      noPublish: true,
      changelogTemplate: undefined,
      releaseCommitTemplate: undefined,
    });
  });

  it('given template override flags when options are parsed then values are read from named options', () => {
    const service = new CliOptionsService();

    expect(
      service.parse(['--dry-run', '--changelog-template', 'templates/custom-changelog.hbs', '--release-commit-template=templates/custom-release.hbs']),
    ).toEqual({
      dryRun: true,
      help: false,
      noPush: false,
      noPublish: false,
      changelogTemplate: 'templates/custom-changelog.hbs',
      releaseCommitTemplate: 'templates/custom-release.hbs',
    });
  });
});

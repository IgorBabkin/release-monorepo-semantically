import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCliOptions, runCli } from './index';
import { MonorepoController } from './MonorepoController';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { ErrorHandler } from './services/ErrorHandler';

describe('runCli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('given --help when the cli starts then it prints usage and exits before reading repo state', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const exitCode = runCli('/repo', ['--help']);

    expect(exitCode).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: monorepo-semantic-release [options]'));
  });

  it('given --dry-run when the cli starts then release is executed in dry-run mode', () => {
    const releaseSpy = vi.spyOn(MonorepoController.prototype, 'release').mockImplementation(() => undefined);
    vi.spyOn(MonorepoController.prototype, 'discoverRootPackageJSON').mockImplementation(() => undefined);
    vi.spyOn(MonorepoController.prototype, 'discoverPackages').mockImplementation(() => undefined);
    vi.spyOn(NodeFileSystemService.prototype, 'readJson').mockReturnValue({});
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const exitCode = runCli('/repo', ['--dry-run']);

    expect(exitCode).toBe(0);
    expect(releaseSpy).toHaveBeenCalledWith({ dryRun: true });
  });

  it('given template override flags when cli options are parsed then values are read from named options', () => {
    expect(
      parseCliOptions(['--dry-run', '--changelog-template', 'templates/custom-changelog.hbs', '--release-commit-template=templates/custom-release.hbs']),
    ).toEqual({
      dryRun: true,
      help: false,
      changelogTemplate: 'templates/custom-changelog.hbs',
      releaseCommitTemplate: 'templates/custom-release.hbs',
    });
  });

  it('given a runtime error when the cli fails then it delegates error reporting to ErrorHandler', () => {
    const expectedError = new Error('boom');
    const handleSpy = vi.spyOn(ErrorHandler.prototype, 'handle').mockImplementation(() => undefined);
    vi.spyOn(NodeFileSystemService.prototype, 'readJson').mockImplementation(() => {
      throw expectedError;
    });

    const exitCode = runCli('/repo', []);

    expect(exitCode).toBe(1);
    expect(handleSpy).toHaveBeenCalledWith(expectedError);
  });
});

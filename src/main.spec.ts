import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from './index';
import { MonorepoController } from './MonorepoController';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { ExceptionHandler } from './services/ExceptionHandler';
import { CliOptionsService } from './services/CliOptionsService';

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
    vi.spyOn(MonorepoController.prototype, 'discoverPackages').mockImplementation(() => undefined);
    vi.spyOn(NodeFileSystemService.prototype, 'readJson').mockReturnValue({});
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const exitCode = runCli('/repo', ['--dry-run']);

    expect(exitCode).toBe(0);
    expect(releaseSpy).toHaveBeenCalledWith({ dryRun: true, noPush: false, noPublish: false });
  });

  it('given cli starts when options are parsed then it delegates parsing to CliOptionsService', () => {
    const parseSpy = vi.spyOn(CliOptionsService.prototype, 'parse').mockReturnValue({
      help: true,
      dryRun: false,
      noPush: false,
      noPublish: false,
    });

    const exitCode = runCli('/repo', ['--help']);

    expect(exitCode).toBe(0);
    expect(parseSpy).toHaveBeenCalledWith(['--help']);
  });

  it('given a runtime error when the cli fails then it delegates error reporting to ExceptionHandler', () => {
    const expectedError = new Error('boom');
    const handleSpy = vi.spyOn(ExceptionHandler.prototype, 'handle').mockImplementation(() => undefined);
    vi.spyOn(NodeFileSystemService.prototype, 'readJson').mockImplementation(() => {
      throw expectedError;
    });

    const exitCode = runCli('/repo', []);

    expect(exitCode).toBe(1);
    expect(handleSpy).toHaveBeenCalledWith(expectedError);
  });
});

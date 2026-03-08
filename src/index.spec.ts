import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from './index';
import { Controller } from './Controller';
import { NodeFileSystemService } from './services/NodeFileSystemService';
import { ExceptionHandler } from './services/ExceptionHandler';
import { CliOptionsService } from './services/CliOptionsService';
import { ReleaseConfigService } from './services/ReleaseConfigService';

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
    const releaseSpy = vi.spyOn(Controller.prototype, 'release').mockImplementation(() => undefined);
    vi.spyOn(Controller.prototype, 'discoverPackages').mockImplementation(() => undefined);
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

  it('given configured plugin order when the cli starts then controller receives plugins in that order', () => {
    const observedPluginConstructors: string[] = [];
    vi.spyOn(NodeFileSystemService.prototype, 'readJson').mockReturnValue({});
    vi.spyOn(ReleaseConfigService.prototype, 'resolvePluginOrder').mockReturnValue(['git', 'changelog']);
    vi.spyOn(Controller.prototype, 'discoverPackages').mockImplementation(function mockDiscoverPackages(this: {
      plugins: Array<{ constructor: { name: string } }>;
    }) {
      observedPluginConstructors.push(...this.plugins.map((plugin) => plugin.constructor.name));
    });
    vi.spyOn(Controller.prototype, 'release').mockImplementation(() => undefined);

    const exitCode = runCli('/repo', ['--dry-run']);

    expect(exitCode).toBe(0);
    expect(observedPluginConstructors).toEqual(['GitPlugin', 'ChangelogPlugin']);
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

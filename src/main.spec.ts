import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from './main';
import { MonorepoController } from './MonorepoController';
import { NodeFileSystemService } from './services/NodeFileSystemService';

describe('runCli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('given --help when the cli starts then it prints usage and exits before reading repo state', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const exitCode = runCli('/repo', ['--help']);

    expect(exitCode).toBe(0);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Usage: monorepo-semantic-release [options]'));
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
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { runCli } from './main';

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
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExceptionHandler } from './ExceptionHandler.js';
import { MissingDependencyVersionException } from './DomainException.js';

describe('ExceptionHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    process.exitCode = 0;
  });

  it('given domain exception when handled then formatted domain error is printed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new ExceptionHandler();

    handler.handleError(new MissingDependencyVersionException('pkg-a', 'pkg-b'), 'report');

    expect(errorSpy).toHaveBeenCalledWith('[report] ✖ [MISSING_DEPENDENCY_VERSION] Dependency pkg-b not found in pkg-a');
  });

  it('given a child process error when handled then stderr is printed as text', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new ExceptionHandler();
    const error = Object.assign(new Error('Command failed'), { stderr: Buffer.from('permission denied') });

    handler.handleError(error);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[.+\] ✖ permission denied$/));
    expect(errorSpy.mock.calls.flat().some((value) => Buffer.isBuffer(value))).toBe(false);
  });

  it('given a GitHub Actions environment when handled then a workflow error annotation is printed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubEnv('GITHUB_ACTIONS', 'true');
    new ExceptionHandler().handleError(new Error('permission denied'));

    expect(errorSpy).toHaveBeenCalledWith('::error::permission denied');
  });

  it('given any exception when handled then the process reports a failing exit code', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new ExceptionHandler();

    handler.handleError(new Error('boom'));

    expect(process.exitCode).toBe(1);
  });
});

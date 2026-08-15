import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExceptionHandler } from './ExceptionHandler.js';
import { MissingDependencyVersionException } from './DomainException.js';

describe('ExceptionHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

  it('given domain exception when handled then formatted domain error is printed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new ExceptionHandler();

    handler.handleError(new MissingDependencyVersionException('pkg-a', 'pkg-b'));

    expect(errorSpy).toHaveBeenCalledWith('[MISSING_DEPENDENCY_VERSION] Dependency pkg-b not found in pkg-a');
  });

  it('given unknown exception when handled then original error object is printed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new ExceptionHandler();
    const error = new Error('boom');

    handler.handleError(error);

    expect(errorSpy).toHaveBeenCalledWith(error);
  });

  it('given any exception when handled then the process reports a failing exit code', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new ExceptionHandler();

    handler.handleError(new Error('boom'));

    expect(process.exitCode).toBe(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { ExceptionHandler } from './ExceptionHandler';
import { MissingDependencyVersionException } from './DomainException';

describe('ExceptionHandler', () => {
  it('given domain exception when handled then formatted domain error is printed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new ExceptionHandler();

    handler.handle(new MissingDependencyVersionException('pkg-a', 'pkg-b'));

    expect(errorSpy).toHaveBeenCalledWith('[MISSING_DEPENDENCY_VERSION] Dependency pkg-b not found in pkg-a');
  });

  it('given unknown exception when handled then original error object is printed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = new ExceptionHandler();
    const error = new Error('boom');

    handler.handle(error);

    expect(errorSpy).toHaveBeenCalledWith(error);
  });
});

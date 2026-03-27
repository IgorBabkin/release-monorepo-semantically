import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container } from 'ts-ioc-container';
import { runCli } from './index';
import { App } from './App';

describe('runCli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('given the cli starts when the app runs successfully then the process exits with zero', () => {
    const app = { run: vi.fn() };
    const exceptionHandler = { handle: vi.fn() };
    vi.spyOn(Container.prototype, 'useModule').mockReturnThis();
    vi.spyOn(Container.prototype, 'resolve').mockImplementation((target: unknown) => (target === App ? app : exceptionHandler) as never);
    vi.spyOn(Container.prototype, 'dispose').mockImplementation(() => undefined);

    const exitCode = runCli('/repo');

    expect(exitCode).toBe(0);
    expect(app.run).toHaveBeenCalledTimes(1);
    expect(exceptionHandler.handle).not.toHaveBeenCalled();
  });

  it('given a runtime error when the cli fails then it delegates error reporting to the exception handler', () => {
    const expectedError = new Error('boom');
    const app = {
      run: vi.fn().mockImplementation(() => {
        throw expectedError;
      }),
    };
    const exceptionHandler = { handle: vi.fn() };
    vi.spyOn(Container.prototype, 'useModule').mockReturnThis();
    vi.spyOn(Container.prototype, 'resolve').mockImplementation((target: unknown) => (target === App ? app : exceptionHandler) as never);
    vi.spyOn(Container.prototype, 'dispose').mockImplementation(() => undefined);

    const exitCode = runCli('/repo');

    expect(exitCode).toBe(1);
    expect(exceptionHandler.handle).toHaveBeenCalledWith(expectedError);
  });
});

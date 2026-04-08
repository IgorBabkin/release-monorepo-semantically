import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container } from 'ts-ioc-container';
import { Application } from 'ib-commander';
import { IMock, It, Mock } from 'moq.ts';
import { runCli } from './index';

describe('runCli', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('given the cli starts when the app runs successfully then the process exits with zero', () => {
    const app: IMock<Application> = new Mock<Application>().setup((x) => x.run()).returns(undefined);

    vi.spyOn(Container.prototype, 'useModule').mockReturnThis();
    vi.spyOn(Container.prototype, 'register').mockReturnThis();
    vi.spyOn(Application, 'bootstrap').mockReturnValue(app.object());

    const exitCode = runCli([]);

    expect(exitCode).toBe(0);
    app.verify((x) => x.run(), It.IsAny());
  });
});

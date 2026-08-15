import 'reflect-metadata';
import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { type IContainer } from 'ts-ioc-container';
import { Application } from './Application.js';
import { IErrorHandler } from './IErrorHandler.js';
import { MissingControllerException } from '../exceptions/DomainException.js';

describe('Application', () => {
  it('given no controller argument when run then it routes MissingControllerException to the error handler without resolving a controller', () => {
    const errorHandler = new Mock<IErrorHandler>().setup((m) => m.handleError(It.IsAny())).returns(undefined);
    const container = new Mock<IContainer>()
      .setup((c) => c.resolve('IErrorHandler', It.IsAny()))
      .returns(errorHandler.object())
      .setup((c) => c.dispose())
      .returns(undefined);

    const app = Application.bootstrap(container.object());
    app.run();

    errorHandler.verify((m) => m.handleError(It.Is((error: unknown) => error instanceof MissingControllerException)), Times.Once());
    container.verify((c) => c.resolve(It.Is((key: unknown) => key !== 'IErrorHandler')), Times.Never());
  });

  it('given a controller and no action when run then it resolves the controller by name and disposes the scope afterwards', () => {
    const errorHandler = new Mock<IErrorHandler>().setup((m) => m.handleError(It.IsAny())).returns(undefined);
    const controller = {};
    const container = new Mock<IContainer>()
      .setup((c) => c.resolve('IErrorHandler', It.IsAny()))
      .returns(errorHandler.object())
      .setup((c) => c.resolve('vcs'))
      .returns(controller)
      .setup((c) => c.dispose())
      .returns(undefined);

    const app = Application.bootstrap(container.object());
    app.run('vcs');

    container.verify((c) => c.resolve('vcs'), Times.Once());
    container.verify((c) => c.dispose(), Times.Once());
    errorHandler.verify((m) => m.handleError(It.IsAny()), Times.Never());
  });

  it('given a flag in the action position when run then the flag is not mistaken for an action name', () => {
    // Regression: commander's allowUnknownOption() previously made the
    // top-level parser swallow --context into the action slot, so every
    // non-default action silently ran zero hooks. This only asserts the
    // controller still resolves; HooksRunner behavior is covered end to end
    // in e2e.
    const errorHandler = new Mock<IErrorHandler>().setup((m) => m.handleError(It.IsAny())).returns(undefined);
    const controller = {};
    const container = new Mock<IContainer>()
      .setup((c) => c.resolve('IErrorHandler', It.IsAny()))
      .returns(errorHandler.object())
      .setup((c) => c.resolve('vcs'))
      .returns(controller)
      .setup((c) => c.dispose())
      .returns(undefined);

    const app = Application.bootstrap(container.object());
    app.run('vcs', '--context', '{}');

    container.verify((c) => c.resolve('vcs'), Times.Once());
    errorHandler.verify((m) => m.handleError(It.IsAny()), Times.Never());
  });

  it('given controller resolution throws when run then the error is routed to the handler and the scope is still disposed', () => {
    const errorHandler = new Mock<IErrorHandler>().setup((m) => m.handleError(It.IsAny())).returns(undefined);
    const boom = new Error('boom');
    const container = new Mock<IContainer>()
      .setup((c) => c.resolve('IErrorHandler', It.IsAny()))
      .returns(errorHandler.object())
      .setup((c) => c.resolve('unknown-controller'))
      .throws(boom)
      .setup((c) => c.dispose())
      .returns(undefined);

    const app = Application.bootstrap(container.object());
    app.run('unknown-controller');

    errorHandler.verify((m) => m.handleError(boom), Times.Once());
    container.verify((c) => c.dispose(), Times.Once());
  });
});

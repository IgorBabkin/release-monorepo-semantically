import 'reflect-metadata';

import { DomainException } from './DomainException.js';
import { register, singleton } from 'ts-ioc-container';
import { IErrorHandler, IErrorHandlerKey } from '../cli/IErrorHandler.js';

// Application resolves IErrorHandlerKey and calls handleError() when a
// command throws.
@register(IErrorHandlerKey, singleton())
export class ExceptionHandler implements IErrorHandler {
  handleError(error: unknown): void {
    if (error instanceof DomainException) {
      console.error(`[${error.code}] ${error.message}`);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  }
}

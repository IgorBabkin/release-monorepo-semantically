import 'reflect-metadata';

import { DomainException } from './DomainException';
import { bindTo, register, SingleToken } from 'ts-ioc-container';

export interface IExceptionHandler {
  handle(error: unknown): void;
}

export const IExceptionHandlerKey = new SingleToken<IExceptionHandler>('IExceptionHandler');

@register(bindTo(IExceptionHandlerKey))
export class ExceptionHandler implements IExceptionHandler {
  handle(error: unknown): void {
    if (error instanceof DomainException) {
      console.error(`[${error.code}] ${error.message}`);
      return;
    }

    console.error(error);
  }
}

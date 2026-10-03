import { SingleToken } from 'ts-ioc-container';

export interface IErrorHandler {
  handleError(error: unknown, step?: string): void;
}

export const IErrorHandlerKey = new SingleToken<IErrorHandler>('IErrorHandler');

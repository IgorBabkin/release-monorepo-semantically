import { SingleToken } from 'ts-ioc-container';

export interface IErrorHandler {
  handleError(error: unknown): void;
}

export const IErrorHandlerKey = new SingleToken<IErrorHandler>('IErrorHandler');

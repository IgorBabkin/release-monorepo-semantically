import {GroupAliasToken} from "ts-ioc-container";

export interface IErrorHandler {
    priority: number;

    matches(error: unknown): boolean;

    handle(error: unknown): void;
}

export const IExceptionHandlerKey = new GroupAliasToken<IErrorHandler>('IExceptionHandler');

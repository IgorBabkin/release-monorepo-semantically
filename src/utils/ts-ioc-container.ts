import { IContainer, ProviderOptions } from 'ts-ioc-container';

/**
 * Injects the raw process arguments the Application handed to the hook
 * context. Meant as the head of an `@inject(commandArgs, ...)` pipe: the
 * mappers that follow turn the argv into a validated options object.
 */
export const commandArgs = (c: IContainer, { args = [] }: ProviderOptions): string[] => args.map(String);

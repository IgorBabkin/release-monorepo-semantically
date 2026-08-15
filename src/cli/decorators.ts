import { addMethodMeta, append, getMethodMeta, hook, type HookType, type IContainer } from 'ts-ioc-container';
import { Command } from 'commander';
import { ZodObject } from 'zod';

export const DEFAULT_ACTION = 'default';

/**
 * Registers a method as a named CLI action, e.g. `@action('tag', execute())`
 * makes `monorepo-semantic-release vcs tag` run it. Wraps ts-ioc-container's
 * hook(), which takes a map function rather than a list of hooks.
 */
export const action = (name: string, ...fns: HookType[]) => hook(name, append(...fns));

/** Runs when the controller is invoked without an action name. */
export const onDefault = (...fns: HookType[]) => action(DEFAULT_ACTION, ...fns);

export const command = (createCmd: (c: IContainer) => Command): MethodDecorator => addMethodMeta('command', () => createCmd);

export const getCommand = (instance: object, methodName: string) => getMethodMeta('command', instance, methodName) as ((c: IContainer) => Command) | undefined;

export const schema = (createSchema: (c: IContainer) => ZodObject): MethodDecorator => addMethodMeta('schema', () => createSchema);

export const getSchema = (instance: object, methodName: string) => getMethodMeta('schema', instance, methodName) as ((c: IContainer) => ZodObject) | undefined;

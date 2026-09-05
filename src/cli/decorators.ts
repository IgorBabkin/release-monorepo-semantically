import { append, hook, type HookType } from 'ts-ioc-container';

export const DEFAULT_ACTION = 'default';

/**
 * Registers a method as a named CLI action, e.g. `@action('tag', execute())`
 * makes `monorepo-semantic-release vcs tag` run it. Wraps ts-ioc-container's
 * hook(), which takes a map function rather than a list of hooks.
 */
export const action = (name: string, ...fns: HookType[]) => hook(name, append(...fns));

/** Runs when the controller is invoked without an action name. */
export const onDefault = (...fns: HookType[]) => action(DEFAULT_ACTION, ...fns);

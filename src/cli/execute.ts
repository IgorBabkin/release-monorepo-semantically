import { type HookFn } from 'ts-ioc-container';

/**
 * Hook that runs a controller method as a CLI action. Its arguments come from
 * the method's own parameter decorators, so an action that needs CLI options
 * declares them itself, e.g.
 * `@inject(commandArgs, parseOptions(stepCommand()), validate(STEP_OPTIONS))`.
 */
export const execute = (): HookFn => (ctx) => {
  ctx.invokeMethod();
};

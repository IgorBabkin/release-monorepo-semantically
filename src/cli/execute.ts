import { type HookFn } from 'ts-ioc-container';
import { getCommand, getSchema } from './decorators.js';

/**
 * Hook that turns a decorated controller method into a CLI action: it parses
 * the process arguments with the method's `@command`, validates them with its
 * `@schema`, and calls the method with the resulting options object.
 *
 * Methods without a `@command` (lifecycle hooks such as `@onConstruct`) are
 * invoked with their injected arguments instead.
 */
export const execute = (): HookFn => (ctx) => {
  // methodName is only absent when a hook runs outside a decorated method,
  // which never happens here — every hook site is a controller method.
  const methodName = ctx.methodName!;
  const resolveCommand = getCommand(ctx.instance, methodName);
  if (!resolveCommand) {
    ctx.invokeMethod();
    return;
  }

  const command = resolveCommand(ctx.scope);
  // Initial args are the raw process arguments; everything from the first flag
  // onwards belongs to this action (what precedes it is controller/action).
  const rawArgs = ctx.getInitialArgs().map(String);
  const firstFlag = rawArgs.findIndex((arg) => arg.startsWith('-'));
  command.parse(firstFlag >= 0 ? ['node', 'script', ...rawArgs.slice(firstFlag)] : ['node', 'script']);

  const resolveSchema = getSchema(ctx.instance, methodName);
  const options = resolveSchema ? resolveSchema(ctx.scope).parse(command.opts()) : command.opts();

  // NOTE: passing args replaces injected parameters rather than merging with
  // them, so an action method must take the options object alone.
  ctx.invokeMethod({ args: [options] });
};

import { HookFn } from 'ts-ioc-container';

export const execute = (): HookFn => (ctx) => {
  const args = ctx.resolveArgs();
  ctx.invokeMethod({ args });
};

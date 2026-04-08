import { HookFn } from 'ts-ioc-container';
import { Command } from 'commander';

function isCommand(value: unknown): value is Command {
  return typeof value === 'object' && value instanceof Command;
}

export const execute = (): HookFn => (ctx) => {
  const args = ctx.resolveArgs();
  for (const arg of args) {
    if (isCommand(arg)) {
      arg.parse();
    }
  }
  ctx.invokeMethod();
};

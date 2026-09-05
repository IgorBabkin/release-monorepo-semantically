import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Mock } from 'moq.ts';
import { createHookContextFactory, type IContainer, inject } from 'ts-ioc-container';
import { Command } from 'commander';
import { z } from 'zod';
import { execute } from './execute.js';
import { commandArgs } from '../utils/ts-ioc-container.js';
import { parseOptions } from '../utils/cli.js';
import { validate } from '../utils/zod.js';

const OPTIONS = z.object({ name: z.string(), dryRun: z.boolean().default(false) });

class Target {
  options?: z.infer<typeof OPTIONS>;
  calledWithoutOptions = false;

  withOptions(
    @inject(commandArgs, parseOptions(new Command().option('--name <value>', 'name').option('--dry-run')), validate(OPTIONS))
    options: z.infer<typeof OPTIONS>,
  ): void {
    this.options = options;
  }

  withoutOptions(): void {
    this.calledWithoutOptions = true;
  }
}

const runHook = (instance: Target, methodName: keyof Target, argv: string[]) => {
  const scope = new Mock<IContainer>().object();
  execute()(createHookContextFactory({ args: argv })(instance, scope, methodName));
};

describe('execute', () => {
  it('given a parameter piping the raw argv through a command and a schema when the hook runs then the method gets the validated options', () => {
    const instance = new Target();

    runHook(instance, 'withOptions', ['vcs', 'commit', '--name', 'pkg-a', '--dry-run']);

    expect(instance.options).toEqual({ name: 'pkg-a', dryRun: true });
  });

  it('given argv that parses but does not satisfy the schema when the hook runs then it throws instead of calling the method', () => {
    const instance = new Target();

    expect(() => runHook(instance, 'withOptions', ['vcs', 'commit', '--dry-run'])).toThrow(z.ZodError);
    expect(instance.options).toBeUndefined();
  });

  it('given a method with no injected parameters when the hook runs then it is invoked as is', () => {
    const instance = new Target();

    runHook(instance, 'withoutOptions', ['report']);

    expect(instance.calledWithoutOptions).toBe(true);
  });
});

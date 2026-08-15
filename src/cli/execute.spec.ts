import 'reflect-metadata';
import { describe, it } from 'vitest';
import { It, Mock, Times } from 'moq.ts';
import { type IContainer, type IHookContext } from 'ts-ioc-container';
import { Command } from 'commander';
import { z } from 'zod';
import { execute } from './execute.js';
import { command, schema } from './decorators.js';

class Target {
  @command(() => new Command().requiredOption('--name <value>', 'name'))
  @schema(() => z.object({ name: z.string() }))
  withCommand(options: { name: string }): void {
    void options;
  }

  noCommand(): void {}
}

describe('execute', () => {
  it('given a method with @command and @schema when the hook runs then it parses argv and invokes the method with the validated options', () => {
    const container = new Mock<IContainer>().object();
    const instance = new Target();
    const context = new Mock<IHookContext>()
      .setup((c) => c.instance)
      .returns(instance)
      .setup((c) => c.methodName)
      .returns('withCommand')
      .setup((c) => c.scope)
      .returns(container)
      .setup((c) => c.getInitialArgs())
      .returns(['vcs', '--name', 'pkg-a'])
      .setup((c) => c.invokeMethod(It.IsAny()))
      .returns(undefined);

    execute()(context.object());

    context.verify(
      (c) => c.invokeMethod(It.Is((call: { args?: unknown[] }) => JSON.stringify(call) === JSON.stringify({ args: [{ name: 'pkg-a' }] }))),
      Times.Once(),
    );
    context.verify((c) => c.invokeMethod(), Times.Never());
  });

  it('given a method with no @command when the hook runs then it invokes the method with its injected arguments', () => {
    const instance = new Target();
    const context = new Mock<IHookContext>()
      .setup((c) => c.instance)
      .returns(instance)
      .setup((c) => c.methodName)
      .returns('noCommand')
      .setup((c) => c.invokeMethod())
      .returns(undefined);

    execute()(context.object());

    context.verify((c) => c.invokeMethod(), Times.Once());
  });
});

import 'reflect-metadata';

import { args, bindTo, inject, register, SingleToken } from 'ts-ioc-container';

type StepName = 'SKIP' | 'BUMP' | 'WRITE' | 'COMMIT' | 'TAG';

const STEP_FORMAT: Record<StepName, { emoji: string; color: number }> = {
  SKIP: { emoji: '⚠', color: 33 },
  BUMP: { emoji: '🚀', color: 32 },
  WRITE: { emoji: '📝', color: 36 },
  COMMIT: { emoji: '📦', color: 35 },
  TAG: { emoji: '🏷️', color: 34 },
};

export interface ILogger {
  info(...args: unknown[]): void;
}

// Deliberately not named 'ILogger': ib-commander's SetupModule registers its own
// logger under that token name, and SingleToken identity is the name.
export const ILoggerKey = new SingleToken<ILogger>('ReleaseLogger');

@register(bindTo(ILoggerKey))
export class ConsoleLogger implements ILogger {
  // Callers inject via ILoggerKey.args('<topic>'); @inject(args(0)) is what
  // actually reads that extra resolution argument back out — an undecorated
  // parameter gets no metadata at all and silently falls back to its default.
  constructor(@inject(args(0)) private topic: string = 'release') {}

  private supportsColor(): boolean {
    return Boolean(process.stderr.isTTY) && !process.env.NO_COLOR;
  }

  private color(text: string, colorCode: number): string {
    if (!this.supportsColor()) {
      return text;
    }

    return `\u001B[${colorCode}m${text}\u001B[0m`;
  }

  private decorateStructuredMessage(message: string): string {
    const match = message.match(/^(SKIP|BUMP|WRITE|COMMIT|TAG)\b/);
    if (!match) {
      return message;
    }

    const step = match[1] as StepName;
    const { emoji, color } = STEP_FORMAT[step];
    return `${emoji} ${this.color(message, color)}`;
  }

  info(...args: unknown[]) {
    // Progress output goes to stderr, not stdout: `report`'s stdout is meant
    // to be captured directly as the release context (see SPECS.md's CI
    // story, `RELEASE_CONTEXT=$(monorepo-semantic-release report)`), and
    // mixing log lines into that stream would corrupt it.
    const renderedArgs = args.map((arg, index) => (index === 0 && typeof arg === 'string' ? this.decorateStructuredMessage(arg) : arg));
    console.error(`[${this.topic}]`, ...renderedArgs);
  }
}

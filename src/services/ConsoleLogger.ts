type StepName = 'SKIP' | 'BUMP' | 'WRITE' | 'COMMIT' | 'TAG';

const STEP_FORMAT: Record<StepName, { emoji: string; color: number }> = {
  SKIP: { emoji: '⚠', color: 33 },
  BUMP: { emoji: '🚀', color: 32 },
  WRITE: { emoji: '📝', color: 36 },
  COMMIT: { emoji: '📦', color: 35 },
  TAG: { emoji: '🏷️', color: 34 },
};

export class ConsoleLogger {
  constructor(private topic: string) {}

  private supportsColor(): boolean {
    return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
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
    const renderedArgs = args.map((arg, index) => (index === 0 && typeof arg === 'string' ? this.decorateStructuredMessage(arg) : arg));
    console.info(`[${this.topic}]`, ...renderedArgs);
  }
}

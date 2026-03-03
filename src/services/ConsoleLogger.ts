export class ConsoleLogger {
  constructor(private topic: string) {}

  info(...args: unknown[]) {
    console.info(`[${this.topic}]`, ...args);
  }
}

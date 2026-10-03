import 'reflect-metadata';

import { register, singleton } from 'ts-ioc-container';
import { IErrorHandler, IErrorHandlerKey } from '../cli/IErrorHandler.js';
import { DomainException } from './DomainException.js';

// Application resolves IErrorHandlerKey and calls handleError() when a
// command throws.
@register(IErrorHandlerKey, singleton())
export class ExceptionHandler implements IErrorHandler {
  handleError(error: unknown, step = 'release'): void {
    const details = this.getChildProcessError(error);
    const code = error instanceof DomainException ? `[${error.code}] ` : '';
    for (const line of details.split(/\r?\n/).filter(Boolean)) {
      const message = `[${step}] ✖ ${code}${line}`;
      console.error(message);
      if (process.env.GITHUB_ACTIONS === 'true') {
        console.error(`::error::${this.escapeAnnotation(line)}`);
      }
    }

    process.exitCode = 1;
  }

  private getChildProcessError(error: unknown): string {
    if (error && typeof error === 'object') {
      const childError = error as { stderr?: Buffer | string; message?: string };
      const stderr = childError.stderr;
      if (stderr) {
        const message = typeof stderr === 'string' ? stderr.trim() : stderr.toString().trim();
        if (message) {
          return message;
        }
      }
      if (childError.message) {
        return childError.message;
      }
    }
    return String(error);
  }

  private escapeAnnotation(message: string): string {
    return message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C');
  }
}

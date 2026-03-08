import { DomainException } from '../exceptions/DomainException';

export class ExceptionHandler {
  handle(error: unknown): void {
    if (error instanceof DomainException) {
      console.error(`[${error.code}] ${error.message}`);
      return;
    }

    console.error(error);
  }
}

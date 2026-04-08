import { bindTo, register, SingleToken } from 'ts-ioc-container';
import * as process from 'node:process';

export interface OutputService {
  write(content: string): void;
}

export const OutputServiceKey = new SingleToken('OutputService');

@register(bindTo(OutputServiceKey))
export class StdOutputService implements OutputService {
  write(content: string): void {
    process.stdout.write(content + '\n');
  }
}

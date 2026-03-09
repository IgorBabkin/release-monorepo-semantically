import 'reflect-metadata';

import { Command } from 'commander';
import { CliOptions } from '../models/CliOptions';
import { bindTo, register, SingleToken } from 'ts-ioc-container';

export interface ICliOptionsService {
  parse(...args: string[]): CliOptions;
}

export const ICliOptionsServiceKey = new SingleToken<ICliOptionsService>('ICliOptionsService');

@register(bindTo(ICliOptionsServiceKey))
export class CliOptionsService implements ICliOptionsService {
  parse(...args: string[]): CliOptions {
    const program = this.createProgram();

    try {
      program.exitOverride();
      program.parse(['node', 'monorepo-semantic-release', ...args], { from: 'node' });
    } catch (error) {
      const commanderError = error as { code?: string };
      if (commanderError.code === 'commander.helpDisplayed') {
        return {
          help: true,
        };
      }
      throw error;
    }

    return {
      help: false,
    };
  }

  private createProgram(): Command {
    return new Command().name('monorepo-semantic-release').allowExcessArguments(false).helpOption('-h, --help', 'Show this help message');
  }
}

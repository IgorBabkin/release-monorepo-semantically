import { ZodType } from 'zod';
import { setParameterMetadata } from 'ts-ioc-container';

export class ArgsProvider {
  constructor(private args: string[]) {}

  getArg(index: number, schema: ZodType): unknown {
    return schema.parse(this.args[index]);
  }

  getOption(field: string, schema: ZodType): unknown {
    const i = this.args.indexOf(`--${field}`);
    return i >= 0 && i + 1 < this.args.length ? schema.parse(this.args[i + 1]) : undefined;
  }
}

const injectMetaKey = (propertyKey: string | symbol) => `inject:${String(propertyKey)}`;

const inject =
  <T = unknown>(fn: (...args: string[]) => T): ParameterDecorator =>
  (target, propertyKey, parameterIndex) =>
    setParameterMetadata(injectMetaKey(propertyKey!), () => fn)(target, propertyKey, parameterIndex);

const getArg =
  (index: number, schema: ZodType) =>
  (...args: string[]) =>
    schema.parse(args.slice(2)[index]);

export const arg =
  (schema: ZodType): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    return inject(getArg(parameterIndex, schema))(target, propertyKey, parameterIndex);
  };

const getOption =
  (field: string, schema: ZodType) =>
  (...args: string[]) => {
    for (let i = 0; i < args.length; i += 1) {
      if (args[i] === `--${field}` && i + 1 < args.length) {
        return schema.parse(args[i + 1]);
      }
    }
    throw new Error(`Unknown option --${field}`);
  };

export const option =
  (field: string, schema: ZodType): ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    return inject(getOption(field, schema))(target, propertyKey, parameterIndex);
  };

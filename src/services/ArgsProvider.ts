import {ZodType} from "zod";
import {constructor, getParameterMetadata, setParameterMetadata} from "ts-ioc-container";

export class ArgsProvider {
    constructor(private args: string[]) {
    }

    getArg(index: number, schema: ZodType): unknown {
        // return schema.parse(this.args[index]);
    }

    getOption(field: string, schema: ZodType): unknown {
        // return schema.parse(this.args[index]);
    }
}

const inject = <T = unknown>(fn: (...args: string[]) => T): ParameterDecorator => setParameterMetadata('inject', () => fn);
const getInjectFns = (target: constructor<unknown>, method: string) => getParameterMetadata('inject', target);

const getArg = (index: number, schema: ZodType) => (args: string[]) => args.slice(2)[index];

export const arg =
    (schema: ZodType): ParameterDecorator =>
        (target, propertyKey, parameterIndex) => {
            return inject(getArg(parameterIndex, schema))(
                target,
                propertyKey,
                parameterIndex,
            );
        };

const getOption = (field: string, schema: ZodType) => (args: string[]) => {
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === `--${field}`) {
            return schema.parse(args[i + 1]);
        }
    }
    throw new Error(`Unknown option --${field}`);
};

export const option =
    (field: string, schema: ZodType): ParameterDecorator =>
        (target, propertyKey, parameterIndex) => {
            return inject(getOption(field, schema))(
                target,
                propertyKey,
                parameterIndex,
            );
        };

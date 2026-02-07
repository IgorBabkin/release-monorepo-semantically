import {setMethodMetadata, inject, setClassMetadata} from "ts-ioc-container";
import {ZodType} from "zod";

export const action = (props: {default?: boolean} = {}) => setMethodMetadata('action', () => props);
export const arg = (schema: ZodType): ParameterDecorator => (target, propertyKey, parameterIndex) => {
    return inject(c => c.resolve('arg')(parameterIndex, schema))(target, propertyKey, parameterIndex);
}
export const option = (field: string, schema: ZodType) => (target, propertyKey, parameterIndex) => {
    return inject(c => c.resolve('option')(field, schema))(target, propertyKey, parameterIndex);
}
export const controller = (props: {alias: string}) => setClassMetadata('controller', () => props);

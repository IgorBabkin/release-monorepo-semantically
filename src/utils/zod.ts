import { z, ZodType } from 'zod';

/**
 * Mapper that validates a loosely-typed value — commander's `opts()` in
 * practice — against a schema and narrows it to the schema's output type.
 */
export const validate =
  <T extends ZodType>(schema: T) =>
  (value: unknown): z.infer<T> =>
    schema.parse(value);

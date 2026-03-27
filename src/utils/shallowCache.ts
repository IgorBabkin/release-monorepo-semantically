export const shallowCache = <T extends (...args: never[]) => unknown>(
  _target: object,
  _propertyKey: string,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T> => {
  const method = descriptor.value;
  if (!method) {
    return descriptor;
  }

  const cache = new WeakMap<object, Array<{ args: readonly unknown[]; result: unknown }>>();

  descriptor.value = function (this: object, ...args: Parameters<T>): ReturnType<T> {
    const instanceEntries = cache.get(this) ?? [];
    const cachedEntry = instanceEntries.find((entry) => entry.args.length === args.length && entry.args.every((value, index) => value === args[index]));

    if (cachedEntry) {
      return cachedEntry.result as ReturnType<T>;
    }

    const result = method.apply(this, args);
    instanceEntries.push({ args: [...args], result });
    cache.set(this, instanceEntries);
    return result as ReturnType<T>;
  } as T;

  return descriptor;
};

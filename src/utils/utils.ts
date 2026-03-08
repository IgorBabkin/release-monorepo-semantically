export function uniqBy<T>(args: T[], predicate: (a: T, b: T) => boolean): T[] {
  return args.reduce<T[]>((acc, current) => {
    return acc.some((a) => predicate(a, current)) ? acc : [...acc, current];
  }, []);
}

export function isPresent<T extends unknown | undefined | null>(value: unknown): value is T {
  return value !== undefined && value !== null;
}

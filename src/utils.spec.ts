import { describe, expect, it } from 'vitest';
import { isPresent, uniqBy } from './utils';

describe('uniqBy', () => {
  it('given duplicate values when uniqBy runs then it keeps first occurrence by predicate', () => {
    const items = [
      { id: 'a', value: 1 },
      { id: 'a', value: 2 },
      { id: 'b', value: 3 },
    ];

    const result = uniqBy(items, (left, right) => left.id === right.id);

    expect(result).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 3 },
    ]);
  });
});

describe('isPresent', () => {
  it('given nullable values when isPresent checks then it returns false only for null and undefined', () => {
    expect(isPresent(undefined)).toBe(false);
    expect(isPresent(null)).toBe(false);
    expect(isPresent(0)).toBe(true);
    expect(isPresent('')).toBe(true);
    expect(isPresent(false)).toBe(true);
  });
});

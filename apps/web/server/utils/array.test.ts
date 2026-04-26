import { describe, it, expect } from 'vitest';
import { chunk } from './array';

describe('chunk', () => {
  it('splits array into equal chunks', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it('handles remainder in final chunk', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns empty array for empty input', () => {
    expect(chunk([], 5)).toEqual([]);
  });

  it('returns single chunk when size exceeds length', () => {
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
  });

  it('works with strings', () => {
    expect(chunk(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']]);
  });

  it('throws for non-positive chunk size', () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow('Chunk size must be positive');
    expect(() => chunk([1, 2, 3], -1)).toThrow('Chunk size must be positive');
  });

  it('works with objects', () => {
    const objs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(chunk(objs, 2)).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
  });

  it('handles chunk size of 1', () => {
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });
});

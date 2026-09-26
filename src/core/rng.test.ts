import { describe, expect, it } from 'vitest';
import { mulberry32, shuffle } from './rng';

describe('mulberry32', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });
  it('returns values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  const items = Array.from({ length: 52 }, (_, i) => i);
  it('returns a permutation and leaves the input untouched', () => {
    const copy = items.slice();
    const out = shuffle(items, mulberry32(1));
    expect(items).toEqual(copy);
    expect(out.slice().sort((x, y) => x - y)).toEqual(items);
  });
  it('is deterministic per seed and differs across seeds', () => {
    expect(shuffle(items, mulberry32(5))).toEqual(shuffle(items, mulberry32(5)));
    expect(shuffle(items, mulberry32(5))).not.toEqual(shuffle(items, mulberry32(6)));
  });
});

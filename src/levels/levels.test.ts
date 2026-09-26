import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../core/layouts';
import { solveLevel } from '../core/solver';
import { LEVELS } from './levels';

describe('LEVELS', () => {
  it('has 25 levels with ids 1..25 in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it('fits every level in one deck with valid star thresholds', () => {
    for (const l of LEVELS) {
      expect(LAYOUTS[l.layoutId].slots.length + l.stockSize).toBeLessThanOrEqual(52);
      expect(l.star2).toBeGreaterThanOrEqual(1);
      expect(l.star3).toBeGreaterThan(l.star2);
    }
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    'level %i is winnable without boosters and 3 stars are reachable',
    (_id, level) => {
      const r = solveLevel(level);
      expect(r.winnable).toBe(true);
      expect(level.star3).toBeLessThanOrEqual(r.bestStockLeft);
    },
    60_000,
  );
});

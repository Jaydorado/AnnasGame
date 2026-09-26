import { describe, expect, it } from 'vitest';
import type { Card } from './cards';
import { buildLayout, isExposed, type LayoutId } from './layout';
import { LAYOUTS } from './layouts';

const c = (rank: number): Card => ({ rank, suit: 0 });

describe('LAYOUTS', () => {
  it.each([
    ['threePeaks', 28],
    ['pyramid', 21],
    ['diamond', 25],
    ['twinPeaks', 20],
    ['wall', 28],
  ] as [LayoutId, number][])('%s has %i slots', (id, n) => {
    expect(LAYOUTS[id].slots).toHaveLength(n);
  });

  it('covers come only from the next row at x ± 0.5; only the last row is uncovered', () => {
    for (const layout of Object.values(LAYOUTS)) {
      layout.slots.forEach((slot) => {
        if (slot.row === layout.rows - 1) {
          expect(slot.coveredBy).toEqual([]);
        } else {
          expect(slot.coveredBy.length).toBeGreaterThan(0);
          for (const i of slot.coveredBy) {
            expect(layout.slots[i].row).toBe(slot.row + 1);
            expect(Math.abs(layout.slots[i].x - slot.x)).toBe(0.5);
          }
        }
      });
    }
  });

  it('threePeaks first peak is covered by slots 3 and 4', () => {
    expect(LAYOUTS.threePeaks.slots[0].coveredBy).toEqual([3, 4]);
  });
});

describe('isExposed', () => {
  it('exposes a slot only when all covering slots are removed', () => {
    const layout = buildLayout('pyramid', [[0.5], [0, 1]]);
    const table: (Card | null)[] = [c(1), c(2), c(3)];
    expect(isExposed(layout.slots[0], table)).toBe(false);
    expect(isExposed(layout.slots[1], table)).toBe(true);
    table[1] = null;
    expect(isExposed(layout.slots[0], table)).toBe(false);
    table[2] = null;
    expect(isExposed(layout.slots[0], table)).toBe(true);
  });
});

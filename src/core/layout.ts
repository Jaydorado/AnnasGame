import type { Card } from './cards';

export type LayoutId = 'threePeaks' | 'pyramid' | 'diamond' | 'twinPeaks' | 'wall';

export interface Slot {
  readonly x: number; // card-width units
  readonly row: number; // 0 = back row
  readonly coveredBy: readonly number[]; // slot indices in row + 1
}

export interface Layout {
  readonly id: LayoutId;
  readonly slots: readonly Slot[];
  readonly width: number; // in card widths
  readonly rows: number;
}

export function buildLayout(id: LayoutId, rows: readonly (readonly number[])[]): Layout {
  const flat = rows.flatMap((xs, row) => xs.map((x) => ({ x, row })));
  const slots = flat.map((s) => ({
    ...s,
    coveredBy: flat.flatMap((o, i) => (o.row === s.row + 1 && Math.abs(o.x - s.x) === 0.5 ? [i] : [])),
  }));
  return { id, slots, width: Math.max(...flat.map((s) => s.x)) + 1, rows: rows.length };
}

export function isExposed(slot: Slot, table: readonly (Card | null)[]): boolean {
  return slot.coveredBy.every((i) => table[i] === null);
}

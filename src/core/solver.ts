import { ranksAdjacent, type Card } from './cards';
import { deal, top } from './game';
import type { Layout } from './layout';
import type { LevelDef } from './level';

export interface SolveResult {
  readonly winnable: boolean;
  readonly bestStockLeft: number; // -1 when not winnable
}

export function solveDeal(layout: Layout, table: readonly Card[], stock: readonly Card[], first: Card): SolveResult {
  const n = table.length;
  if (n !== layout.slots.length) throw new Error('table size does not match layout');
  if (n > 30) throw new Error('solver supports at most 30 table slots');
  if (stock.length > 63) throw new Error('solver supports at most 63 stock cards');
  const ranks = table.map((card) => card.rank);
  const stockRanks = stock.map((card) => card.rank);
  const coverMask = layout.slots.map((slot) => slot.coveredBy.reduce((m, i) => m | (1 << i), 0));
  const full = 2 ** n - 1;
  const memo = new Map<number, number>();

  const best = (removed: number, stockLen: number, topRank: number): number => {
    if (removed === full) return stockLen;
    const key = (removed * 64 + stockLen) * 16 + topRank;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let result = -1;
    for (let i = 0; i < n && result < stockLen; i++) {
      const bit = 1 << i;
      if ((removed & bit) === 0 && (coverMask[i] & ~removed) === 0 && ranksAdjacent(ranks[i], topRank)) {
        result = Math.max(result, best(removed | bit, stockLen, ranks[i]));
      }
    }
    if (stockLen > 0 && result < stockLen - 1) {
      result = Math.max(result, best(removed, stockLen - 1, stockRanks[stockLen - 1]));
    }
    memo.set(key, result);
    return result;
  };

  const r = best(0, stock.length, first.rank);
  return { winnable: r >= 0, bestStockLeft: r };
}

export function solveLevel(level: LevelDef): SolveResult {
  const s = deal(level, 0);
  const first = top(s);
  if (first === 'wild') throw new Error('unreachable: fresh deal has a card on top');
  return solveDeal(s.layout, s.table as Card[], s.stock, first);
}

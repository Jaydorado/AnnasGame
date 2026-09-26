import { describe, expect, it } from 'vitest';
import type { Card } from './cards';
import { buildLayout } from './layout';
import { solveDeal, solveLevel } from './solver';

const c = (rank: number): Card => ({ rank, suit: 0 });
const tiny = buildLayout('pyramid', [[0.5], [0, 1]]);
const solve = (table: number[], stock: number[], first: number) =>
  solveDeal(tiny, table.map(c), stock.map(c), c(first));

describe('solveDeal', () => {
  it('wins a chain without drawing', () => {
    expect(solve([7, 5, 6], [], 4)).toEqual({ winnable: true, bestStockLeft: 0 });
  });
  it('reports an unwinnable deal', () => {
    expect(solve([9, 5, 6], [], 4)).toEqual({ winnable: false, bestStockLeft: -1 });
  });
  it('draws from the stock when needed', () => {
    expect(solve([9, 5, 6], [8], 4)).toEqual({ winnable: true, bestStockLeft: 0 });
  });
  it('maximizes cards left in the stock', () => {
    expect(solve([7, 5, 6], [3], 4)).toEqual({ winnable: true, bestStockLeft: 1 });
  });
  it('treats king and ace as adjacent', () => {
    expect(solve([2, 13, 1], [], 12)).toEqual({ winnable: true, bestStockLeft: 0 });
  });
});

describe('solveLevel', () => {
  it('solves a real deal deterministically', () => {
    const lvl = { id: 1, layoutId: 'pyramid', seed: 3, stockSize: 22, star2: 1, star3: 2 } as const;
    expect(solveLevel(lvl)).toEqual(solveLevel(lvl));
  });
});

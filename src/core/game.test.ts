import { describe, expect, it } from 'vitest';
import type { Card, Suit } from './cards';
import { buildLayout } from './layout';
import type { LevelDef } from './level';
import { createState, deal, playable, reduce, top, type GameState } from './game';

const c = (rank: number, suit: Suit = 0): Card => ({ rank, suit });
// Slot 0 is behind slots 1 and 2.
const tiny = buildLayout('pyramid', [[0.5], [0, 1]]);
const level: LevelDef = { id: 1, layoutId: 'pyramid', seed: 42, stockSize: 3, star2: 1, star3: 2 };
/** Stock last element is the next draw. */
const start = (table: number[], stock: number[] = [1, 2], first = 4, coins = 100): GameState =>
  createState(level, tiny, table.map((r) => c(r)), stock.map((r) => c(r)), c(first), coins);
const play = (s: GameState, slot: number) => reduce(s, { type: 'play', slot });
const draw = (s: GameState) => reduce(s, { type: 'draw' });
const undo = (s: GameState) => reduce(s, { type: 'undo' });
const wild = (s: GameState) => reduce(s, { type: 'wild' });
const addFive = (s: GameState) => reduce(s, { type: 'addFive' });
const topRank = (s: GameState) => {
  const t = top(s);
  return t === 'wild' ? 'wild' : t.rank;
};
/** 9 behind 5 and 6; top 4; stock [A, 2]. Play 5, 6, draw 2, draw A → stuck. */
const stuckState = () => draw(draw(play(play(start([9, 5, 6]), 1), 2)));

describe('play', () => {
  it('moves an exposed adjacent card to the discard and earns a coin', () => {
    const n = play(start([9, 5, 6]), 1);
    expect(n.table[1]).toBeNull();
    expect(topRank(n)).toBe(5);
    expect(n.streak).toBe(1);
    expect(n.coins).toBe(101);
    expect(n.status).toBe('playing');
  });

  it('rejects covered, non-adjacent, and already-played slots', () => {
    const s = start([9, 5, 6]);
    expect(play(s, 0)).toBe(s); // covered
    expect(play(s, 2)).toBe(s); // 6 on 4
    const n = play(s, 1);
    expect(play(n, 1)).toBe(n); // empty
    expect(play(s, 99)).toBe(s);
  });

  it('lists playable slots', () => {
    expect(playable(start([9, 5, 6]))).toEqual([1]);
  });

  it('wins when the table is empty and pays win + stock bonus', () => {
    const won = play(play(play(start([7, 5, 6]), 1), 2), 0);
    expect(won.status).toBe('won');
    expect(won.coins).toBe(100 + 3 + 20 + 2 * 2);
  });

  it('pays the streak bonus on the 5th consecutive play', () => {
    const row = buildLayout('wall', [[0, 1, 2, 3, 4]]);
    let s = createState(level, row, [5, 6, 7, 8, 9].map((r) => c(r)), [c(1), c(2)], c(4), 100);
    for (let i = 0; i < 5; i++) s = play(s, i);
    expect(s.status).toBe('won');
    expect(s.coins).toBe(100 + 5 + 5 + 20 + 2 * 2);
  });
});

describe('draw', () => {
  it('flips the next stock card and resets the streak', () => {
    const n = draw(play(start([9, 5, 6]), 1));
    expect(topRank(n)).toBe(2);
    expect(n.stock).toHaveLength(1);
    expect(n.streak).toBe(0);
  });

  it('becomes stuck with an empty stock and no playable card', () => {
    const s = stuckState();
    expect(s.status).toBe('stuck');
    expect(draw(s)).toBe(s);
  });
});

describe('wild', () => {
  it('costs 25, keeps the streak, and accepts any card', () => {
    const p = play(start([9, 5, 6]), 1);
    const w = wild(p);
    expect(w.coins).toBe(p.coins - 25);
    expect(w.streak).toBe(1);
    expect(topRank(w)).toBe('wild');
    expect(topRank(play(w, 2))).toBe(6);
  });

  it('rescues a stuck game', () => {
    const w = wild(stuckState());
    expect(w.status).toBe('playing');
    expect(play(w, 0).status).toBe('won');
  });

  it('is rejected when unaffordable or when a wild is already on top', () => {
    const poor = start([9, 5, 6], [1, 2], 4, 24);
    expect(wild(poor)).toBe(poor);
    const w = wild(start([9, 5, 6]));
    expect(wild(w)).toBe(w);
  });
});

describe('addFive', () => {
  it('costs 30, adds 5 cards under the stock, and unsticks the game', () => {
    const s = stuckState();
    const a = addFive(s);
    expect(a.coins).toBe(s.coins - 30);
    expect(a.stock).toHaveLength(5);
    expect(a.fiveUses).toBe(1);
    expect(a.status).toBe('playing');
  });

  it('is deterministic for the same state', () => {
    const s = stuckState();
    expect(addFive(s).stock).toEqual(addFive(s).stock);
  });

  it('keeps existing stock on top', () => {
    const s = start([9, 5, 6]);
    const a = addFive(s);
    expect(a.stock.slice(5)).toEqual(s.stock);
  });

  it('works on a full 52-card deal', () => {
    const d = deal({ id: 1, layoutId: 'threePeaks', seed: 7, stockSize: 24, star2: 1, star3: 2 }, 100);
    expect(addFive(d).stock).toHaveLength(23 + 5);
  });

  it('is rejected when unaffordable', () => {
    const poor = start([9, 5, 6], [1, 2], 4, 29);
    expect(addFive(poor)).toBe(poor);
  });
});

describe('undo', () => {
  it('reverts a play and its coin, costing 5', () => {
    const s = start([9, 5, 6]);
    const u = undo(play(s, 1));
    expect(u.table).toEqual(s.table);
    expect(topRank(u)).toBe(4);
    expect(u.streak).toBe(0);
    expect(u.coins).toBe(95);
  });

  it('chains across several moves without refunding earlier undo costs', () => {
    const s = start([9, 5, 6]);
    const u = undo(undo(play(play(s, 1), 2)));
    expect(u.table).toEqual(s.table);
    expect(u.coins).toBe(90);
  });

  it('reverts a draw', () => {
    const s = start([9, 5, 6]);
    const u = undo(draw(s));
    expect(u.stock).toEqual(s.stock);
    expect(topRank(u)).toBe(4);
  });

  it('is rejected after a booster, after a win, with no history, or when unaffordable', () => {
    const w = wild(play(start([9, 5, 6]), 1));
    expect(undo(w)).toBe(w);
    const won = play(play(play(start([7, 5, 6]), 1), 2), 0);
    expect(undo(won)).toBe(won);
    const fresh = start([9, 5, 6]);
    expect(undo(fresh)).toBe(fresh);
    const poor = play(start([9, 5, 6], [1, 2], 4, 3), 1);
    expect(undo(poor)).toBe(poor);
  });
});

describe('deal', () => {
  const lvl: LevelDef = { id: 1, layoutId: 'threePeaks', seed: 99, stockSize: 24, star2: 1, star3: 2 };

  it('is deterministic per seed', () => {
    const a = deal(lvl, 0);
    const b = deal(lvl, 0);
    expect(a.table).toEqual(b.table);
    expect(a.stock).toEqual(b.stock);
    expect(a.discard).toEqual(b.discard);
    expect(deal({ ...lvl, seed: 100 }, 0).table).not.toEqual(a.table);
  });

  it('fills slots, stock minus one, and one discard from 52 distinct cards', () => {
    const d = deal(lvl, 0);
    expect(d.table).toHaveLength(28);
    expect(d.stock).toHaveLength(23);
    expect(d.discard).toHaveLength(1);
    const all = [...d.table, ...d.stock, ...d.discard] as Card[];
    expect(new Set(all.map((x) => `${x.rank}-${x.suit}`)).size).toBe(52);
  });

  it('throws when the level needs more than 52 cards', () => {
    expect(() => deal({ ...lvl, stockSize: 25 }, 0)).toThrow();
  });
});

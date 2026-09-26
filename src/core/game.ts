import { canPlay, fullDeck, type Card, type Suit, type Top } from './cards';
import { ECON, streakBonus } from './economy';
import { isExposed, type Layout } from './layout';
import { LAYOUTS } from './layouts';
import type { LevelDef } from './level';
import { mulberry32, shuffle } from './rng';

export type Status = 'playing' | 'won' | 'stuck';

export type Action =
  | { readonly type: 'play'; readonly slot: number }
  | { readonly type: 'draw' }
  | { readonly type: 'wild' }
  | { readonly type: 'addFive' }
  | { readonly type: 'undo' };

export interface GameState {
  readonly level: LevelDef;
  readonly layout: Layout;
  readonly table: readonly (Card | null)[];
  readonly stock: readonly Card[]; // last = next draw
  readonly discard: readonly Top[]; // last = top
  readonly streak: number;
  readonly coins: number; // wallet total, live
  readonly fiveUses: number;
  readonly lastEarned: number; // coins earned by the move that produced this state
  readonly status: Status;
  readonly undoTo: GameState | null; // state before the last Play/Draw
}

function statusOf(layout: Layout, table: readonly (Card | null)[], stock: readonly Card[], t: Top): Status {
  if (table.every((card) => card === null)) return 'won';
  if (stock.length > 0 || t === 'wild') return 'playing';
  const canMove = table.some((card, i) => card !== null && isExposed(layout.slots[i], table) && canPlay(card, t));
  return canMove ? 'playing' : 'stuck';
}

export function createState(
  level: LevelDef,
  layout: Layout,
  table: readonly Card[],
  stock: readonly Card[],
  first: Card,
  coins: number,
): GameState {
  return {
    level,
    layout,
    table: [...table],
    stock: [...stock],
    discard: [first],
    streak: 0,
    coins,
    fiveUses: 0,
    lastEarned: 0,
    status: statusOf(layout, table, stock, first),
    undoTo: null,
  };
}

export function deal(level: LevelDef, coins: number): GameState {
  const layout = LAYOUTS[level.layoutId];
  const n = layout.slots.length;
  if (level.stockSize < 1 || n + level.stockSize > 52) {
    throw new Error(`Level ${level.id}: ${n} slots + ${level.stockSize} stock does not fit one deck`);
  }
  const deck = shuffle(fullDeck(), mulberry32(level.seed));
  const stock = deck.slice(n, n + level.stockSize);
  const first = stock.pop()!;
  return createState(level, layout, deck.slice(0, n), stock, first, coins);
}

export function top(s: GameState): Top {
  return s.discard[s.discard.length - 1];
}

export function playable(s: GameState): number[] {
  if (s.status === 'won') return [];
  const t = top(s);
  return s.table.flatMap((card, i) => (card && isExposed(s.layout.slots[i], s.table) && canPlay(card, t) ? [i] : []));
}

export function reduce(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'play': {
      const card = s.table[a.slot];
      if (s.status !== 'playing' || !card || !isExposed(s.layout.slots[a.slot], s.table) || !canPlay(card, top(s))) {
        return s;
      }
      const table = s.table.slice();
      table[a.slot] = null;
      const streak = s.streak + 1;
      const status = statusOf(s.layout, table, s.stock, card);
      let earned = ECON.perCard + streakBonus(streak);
      if (status === 'won') earned += ECON.winBonus + ECON.perStockLeft * s.stock.length;
      return {
        ...s,
        table,
        discard: [...s.discard, card],
        streak,
        coins: s.coins + earned,
        lastEarned: earned,
        status,
        undoTo: s,
      };
    }
    case 'draw': {
      if (s.status !== 'playing' || s.stock.length === 0) return s;
      const card = s.stock[s.stock.length - 1];
      const stock = s.stock.slice(0, -1);
      return {
        ...s,
        stock,
        discard: [...s.discard, card],
        streak: 0,
        lastEarned: 0,
        status: statusOf(s.layout, s.table, stock, card),
        undoTo: s,
      };
    }
    case 'wild': {
      if (s.status === 'won' || s.coins < ECON.wildCost || top(s) === 'wild') return s;
      return {
        ...s,
        discard: [...s.discard, 'wild'],
        coins: s.coins - ECON.wildCost,
        lastEarned: 0,
        status: 'playing',
        undoTo: null,
      };
    }
    case 'addFive': {
      if (s.status === 'won' || s.coins < ECON.addFiveCost) return s;
      const rand = mulberry32(s.level.seed + s.fiveUses + 1);
      const extra: Card[] = Array.from({ length: ECON.addFiveCount }, () => ({
        rank: 1 + Math.floor(rand() * 13),
        suit: Math.floor(rand() * 4) as Suit,
      }));
      const stock = [...extra, ...s.stock];
      return {
        ...s,
        stock,
        coins: s.coins - ECON.addFiveCost,
        fiveUses: s.fiveUses + 1,
        lastEarned: 0,
        status: statusOf(s.layout, s.table, stock, top(s)),
        undoTo: null,
      };
    }
    case 'undo': {
      const prev = s.undoTo;
      if (!prev || s.status === 'won') return s;
      const coins = s.coins - s.lastEarned - ECON.undoCost;
      if (coins < 0) return s;
      return { ...prev, coins };
    }
  }
}

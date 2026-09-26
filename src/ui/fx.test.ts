import { describe, expect, it } from 'vitest';
import type { Card } from '../core/cards';
import { deal, reduce, type GameState } from '../core/game';
import { LEVELS } from '../levels/levels';
import { arcPath, playCoins } from './fx';

/** A level-1 state with only the given cards left on the table (all exposed) and `onTop` as the waste. */
function endgame(cards: readonly [number, Card][], onTop: Card, streak: number): GameState {
  const s = deal(LEVELS[0], 100);
  const table: (Card | null)[] = s.table.map(() => null);
  for (const [slot, card] of cards) table[slot] = card;
  return { ...s, table, discard: [...s.discard, onTop], streak, status: 'playing' };
}

describe('playCoins (coin popups read from the state diff)', () => {
  it('splits a plain play into the per-card coin and no streak bonus', () => {
    const prev = endgame([[0, { rank: 5, suit: 0 }], [1, { rank: 9, suit: 1 }]], { rank: 4, suit: 2 }, 0);
    const next = reduce(prev, { type: 'play', slot: 0 });
    expect(playCoins(prev, next)).toEqual({ card: 1, streak: 0 });
  });

  it('reports the streak bonus on a fifth card in a row', () => {
    const prev = endgame([[0, { rank: 5, suit: 0 }], [1, { rank: 9, suit: 1 }]], { rank: 4, suit: 2 }, 4);
    const next = reduce(prev, { type: 'play', slot: 0 });
    expect(next.coins - prev.coins).toBe(6);
    expect(playCoins(prev, next)).toEqual({ card: 1, streak: 5 });
  });

  it('leaves the win bonus out of the popups on the winning card', () => {
    const prev = endgame([[0, { rank: 5, suit: 0 }]], { rank: 4, suit: 2 }, 1);
    const next = reduce(prev, { type: 'play', slot: 0 });
    expect(next.status).toBe('won');
    expect(playCoins(prev, next)).toEqual({ card: 1, streak: 0 });
  });

  it('still shows the streak bonus when the winning card completes a streak of 10', () => {
    const prev = endgame([[0, { rank: 5, suit: 0 }]], { rank: 4, suit: 2 }, 9);
    const next = reduce(prev, { type: 'play', slot: 0 });
    expect(next.status).toBe('won');
    expect(playCoins(prev, next)).toEqual({ card: 1, streak: 10 });
  });
});

describe('arcPath (card flight to the discard)', () => {
  const dx = 180;
  const dy = 140;
  const k = 0.75;
  const path = arcPath(dx, dy, k);
  const landing = path.findIndex((p) => p.x === dx && p.y === dy);

  it('starts where the card was, untransformed', () => {
    expect(path[0]).toMatchObject({ offset: 0, x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  });

  it('rises above both ends before it comes down', () => {
    expect(Math.min(...path.map((p) => p.y))).toBeLessThan(Math.min(0, dy) - 10);
  });

  it('lands on the discard, squashes, and settles upright at the discard size', () => {
    expect(landing).toBeGreaterThan(0);
    const squash = path.slice(landing + 1).find((p) => p.sx > k && p.sy < k);
    expect(squash).toBeDefined();
    expect(path.at(-1)).toEqual({ offset: 1, x: dx, y: dy, rot: 0, sx: k, sy: k });
  });

  it('keeps offsets increasing from 0 to 1', () => {
    for (let i = 1; i < path.length; i++) expect(path[i].offset).toBeGreaterThan(path[i - 1].offset);
  });
});

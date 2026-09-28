import { describe, expect, it } from 'vitest';
import type { Card } from '../core/cards';
import { deal, reduce, type GameState } from '../core/game';
import { LEVELS } from '../levels/levels';
import { DRAW_FLY_MS, PLAY_FLY_MS, POP_IN_MS, POP_SCALE, SPIN_DEG, SQUASH_MS, arcPath, playCoins } from './fx';

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
  const k = 1.1;
  const h = 95;
  const play = arcPath(dx, dy, k, h, PLAY_FLY_MS, POP_IN_MS);
  const draw = arcPath(90, 0, 1, 105, DRAW_FLY_MS, 0);

  it('starts where the card was, untransformed', () => {
    for (const path of [play, draw]) expect(path[0]).toEqual({ offset: 0, x: 0, y: 0, rot: 0, sx: 1, sy: 1 });
  });

  it('pops a table card in place first; a drawn card leaves at once', () => {
    expect(play[1]).toEqual({ offset: POP_IN_MS / PLAY_FLY_MS, x: 0, y: 0, rot: 0, sx: POP_SCALE, sy: POP_SCALE });
    expect(draw.filter((p) => p.x === 0 && p.y === 0)).toHaveLength(1);
  });

  it('flies a high arc: well above both ends before it comes down', () => {
    expect(Math.min(...play.map((p) => p.y))).toBeLessThan(Math.min(0, dy) - 30);
    expect(Math.min(...draw.map((p) => p.y))).toBeLessThan(-30);
  });

  it('spins one full turn during the flight, turning the way it flies', () => {
    for (const path of [play, draw]) {
      for (let i = 1; i < path.length; i++) expect(path[i].rot).toBeGreaterThanOrEqual(path[i - 1].rot);
      expect(path.at(-1)!.rot).toBe(SPIN_DEG);
    }
    expect(Math.max(...play.slice(0, 3).map((p) => p.rot))).toBeLessThan(SPIN_DEG);
    expect(arcPath(-120, 140, 1, h, PLAY_FLY_MS, POP_IN_MS).at(-1)!.rot).toBe(-SPIN_DEG);
  });

  it('lands on the discard, squashes on its bottom edge, and settles upright at the discard size', () => {
    for (const [path, ms, kk, hh] of [
      [play, PLAY_FLY_MS, k, h],
      [draw, DRAW_FLY_MS, 1, 105],
    ] as const) {
      const landing = path.findIndex((p) => p.offset === (ms - SQUASH_MS) / ms);
      expect(path[landing]).toMatchObject({ x: path.at(-1)!.x, y: path.at(-1)!.y, rot: SPIN_DEG, sx: kk, sy: kk });
      const after = path.slice(landing + 1);
      expect(after.some((p) => p.sx > kk && p.sy < kk)).toBe(true);
      // The bottom edge stays on the discard: centre y + half the scaled height is constant.
      for (const p of after) expect(p.y + (p.sy * hh) / 2).toBeCloseTo(path[landing].y + (kk * hh) / 2, 9);
    }
    expect(play.at(-1)).toEqual({ offset: 1, x: dx, y: dy, rot: SPIN_DEG, sx: k, sy: k });
  });

  it('keeps offsets increasing from 0 to 1', () => {
    for (const path of [play, draw]) {
      for (let i = 1; i < path.length; i++) expect(path[i].offset).toBeGreaterThan(path[i - 1].offset);
      expect(path.at(-1)!.offset).toBe(1);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { canPlay, fullDeck, ranksAdjacent, type Card } from './cards';

const c = (rank: number): Card => ({ rank, suit: 0 });

describe('ranksAdjacent', () => {
  it('accepts one rank up or down', () => {
    expect(ranksAdjacent(5, 4)).toBe(true);
    expect(ranksAdjacent(5, 6)).toBe(true);
  });
  it('rejects equal and distant ranks', () => {
    expect(ranksAdjacent(5, 5)).toBe(false);
    expect(ranksAdjacent(5, 7)).toBe(false);
    expect(ranksAdjacent(1, 12)).toBe(false);
  });
  it('wraps king and ace both ways', () => {
    expect(ranksAdjacent(13, 1)).toBe(true);
    expect(ranksAdjacent(1, 13)).toBe(true);
  });
});

describe('canPlay', () => {
  it('ignores suit', () => {
    expect(canPlay({ rank: 9, suit: 1 }, { rank: 10, suit: 3 })).toBe(true);
    expect(canPlay(c(9), c(9))).toBe(false);
  });
  it('accepts any card on a wild', () => {
    expect(canPlay(c(7), 'wild')).toBe(true);
    expect(canPlay(c(13), 'wild')).toBe(true);
  });
});

describe('fullDeck', () => {
  it('has 52 distinct cards', () => {
    const deck = fullDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((d) => `${d.rank}-${d.suit}`)).size).toBe(52);
  });
});

import { describe, expect, it } from 'vitest';
import { starsFor, streakBonus } from './economy';

describe('streakBonus', () => {
  it('pays the streak value on multiples of 5 only', () => {
    expect([1, 2, 3, 4, 5, 6, 9, 10, 15].map(streakBonus)).toEqual([0, 0, 0, 0, 5, 0, 0, 10, 15]);
  });
});

describe('starsFor', () => {
  it('uses star2/star3 thresholds on cards left in stock', () => {
    const level = { star2: 3, star3: 6 };
    expect([0, 2, 3, 5, 6, 10].map((n) => starsFor(level, n))).toEqual([1, 1, 2, 2, 3, 3]);
  });
});

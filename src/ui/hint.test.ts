import { describe, expect, it } from 'vitest';
import { hintText } from './hint';

describe('hintText (first-timer hint on level 1)', () => {
  it.each([
    [1, 'Ace'],
    [2, '2'],
    [5, '5'],
    [10, '10'],
    [11, 'Jack'],
    [12, 'Queen'],
    [13, 'King'],
  ] as const)('names the waste rank %i as "%s"', (rank, word) => {
    expect(hintText({ rank, suit: 1 })).toBe(`Tap a card one higher or lower than the ${word}!`);
  });

  it('asks for any open card when the waste is a Wild', () => {
    expect(hintText('wild')).toBe('Tap any open card!');
  });
});

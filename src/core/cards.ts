/** 0 ♠, 1 ♥, 2 ♦, 3 ♣ */
export type Suit = 0 | 1 | 2 | 3;

export interface Card {
  readonly rank: number; // 1 (A) .. 13 (K)
  readonly suit: Suit;
}

/** Top of the discard pile: a card or a placed Wild. */
export type Top = Card | 'wild';

export const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export function ranksAdjacent(a: number, b: number): boolean {
  const d = Math.abs(a - b);
  return d === 1 || d === 12;
}

export function canPlay(card: Card, top: Top): boolean {
  return top === 'wild' || ranksAdjacent(card.rank, top.rank);
}

export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of [0, 1, 2, 3] as const) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ rank, suit });
  }
  return deck;
}

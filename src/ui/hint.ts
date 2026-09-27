/**
 * First-timer hint on level 1: a speech bubble from the corner cat that names the real waste rank.
 * Whether it was seen lives in its own localStorage key, outside the save format.
 */
import type { Top } from '../core/cards';
import { RANK_NAMES } from './board';

/** Set to "1" once the player has played a card to the waste; the hint never shows again. */
const HINT_KEY = 'tripeaks.hintSeen';

/** The bubble's text for the current waste top, with a friendly rank word ("Ace", "5", "Queen"). */
export function hintText(top: Top): string {
  if (top === 'wild') return 'Tap any open card!';
  return `Tap a card one higher or lower than the ${RANK_NAMES[top.rank]}!`;
}

export function hintSeen(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false; // storage blocked: show the hint; it still goes away after the first play
  }
}

export function markHintSeen(): void {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    // storage blocked: nothing to remember
  }
}

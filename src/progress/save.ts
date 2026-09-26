import { ECON } from '../core/economy';

export type Stars = 1 | 2 | 3;

export interface SaveV1 {
  readonly version: 1;
  readonly coins: number;
  readonly unlocked: number; // highest playable level id
  readonly stars: Readonly<Record<number, Stars>>;
  readonly threeStarBonusPaid: readonly number[];
}

export const SAVE_KEY = 'tripeaks.save';

export function freshSave(): SaveV1 {
  return { version: 1, coins: ECON.startCoins, unlocked: 1, stars: {}, threeStarBonusPaid: [] };
}

const isInt = (v: unknown): v is number => Number.isInteger(v);

function isSave(v: unknown): v is SaveV1 {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.version !== 1) return false;
  if (!isInt(o.coins) || o.coins < 0) return false;
  if (!isInt(o.unlocked) || o.unlocked < 1) return false;
  if (typeof o.stars !== 'object' || o.stars === null || Array.isArray(o.stars)) return false;
  for (const [k, s] of Object.entries(o.stars)) {
    if (!/^\d+$/.test(k) || (s !== 1 && s !== 2 && s !== 3)) return false;
  }
  return Array.isArray(o.threeStarBonusPaid) && o.threeStarBonusPaid.every(isInt);
}

export function parseSave(raw: string | null): SaveV1 {
  if (raw === null) return freshSave();
  try {
    const v: unknown = JSON.parse(raw);
    return isSave(v) ? v : freshSave();
  } catch {
    return freshSave();
  }
}

export function loadSave(storage: Pick<Storage, 'getItem'> = localStorage): SaveV1 {
  return parseSave(storage.getItem(SAVE_KEY));
}

export function writeSave(save: SaveV1, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
}

/** A win this session recorded: the level, its stars, and how many levels the game has. */
export interface SessionWin {
  readonly levelId: number;
  readonly stars: Stars;
  readonly levelCount: number;
}

/**
 * Applies one session's progress to the save just read from storage, so a stale page never writes
 * back an old whole-save copy. Coins get only the session delta (`sessionCoins - baselineCoins`,
 * clamped at 0 if another page spent the same coins); the caller then moves its baseline to
 * `sessionCoins`. A win keeps the best stars and highest unlock and pays the 3-star bonus only
 * if the stored save has not paid it for that level yet.
 */
export function mergeSessionIntoSave(
  stored: SaveV1,
  baselineCoins: number,
  sessionCoins: number,
  win?: SessionWin,
): { save: SaveV1; bonus: number } {
  const save = { ...stored, coins: Math.max(0, stored.coins + sessionCoins - baselineCoins) };
  return win ? recordWin(save, win.levelId, win.stars, win.levelCount) : { save, bonus: 0 };
}

export function recordWin(save: SaveV1, levelId: number, stars: Stars, levelCount: number): { save: SaveV1; bonus: number } {
  const bonus = stars === 3 && !save.threeStarBonusPaid.includes(levelId) ? ECON.threeStarBonus : 0;
  const best = Math.max(save.stars[levelId] ?? 0, stars) as Stars;
  return {
    bonus,
    save: {
      ...save,
      coins: save.coins + bonus,
      unlocked: Math.max(save.unlocked, Math.min(levelId + 1, levelCount)),
      stars: { ...save.stars, [levelId]: best },
      threeStarBonusPaid: bonus > 0 ? [...save.threeStarBonusPaid, levelId] : save.threeStarBonusPaid,
    },
  };
}

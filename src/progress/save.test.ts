import { describe, expect, it } from 'vitest';
import { freshSave, loadSave, mergeSessionIntoSave, parseSave, recordWin, SAVE_KEY, writeSave, type SaveV1 } from './save';

const memoryStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('parseSave', () => {
  it('returns a fresh save for missing, corrupt, wrong-shape, or unknown-version data', () => {
    const fresh = freshSave();
    expect(parseSave(null)).toEqual(fresh);
    expect(parseSave('{not json')).toEqual(fresh);
    expect(parseSave(JSON.stringify({ version: 2, coins: 5 }))).toEqual(fresh);
    expect(parseSave(JSON.stringify({ ...fresh, coins: -5 }))).toEqual(fresh);
    expect(parseSave(JSON.stringify({ ...fresh, stars: { 1: 4 } }))).toEqual(fresh);
    expect(parseSave(JSON.stringify({ ...fresh, unlocked: 0 }))).toEqual(fresh);
  });

  it('starts with 100 coins and level 1 unlocked', () => {
    expect(freshSave()).toEqual({ version: 1, coins: 100, unlocked: 1, stars: {}, threeStarBonusPaid: [] });
  });
});

describe('storage round trip', () => {
  it('writes and reads back the same save under the save key', () => {
    const storage = memoryStorage();
    const save = { ...freshSave(), coins: 321, unlocked: 4, stars: { 1: 3, 2: 1, 3: 2 } as const, threeStarBonusPaid: [1] };
    writeSave(save, storage);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    expect(loadSave(storage)).toEqual(save);
  });
});

describe('recordWin', () => {
  it('unlocks the next level and keeps the best stars', () => {
    let { save } = recordWin(freshSave(), 1, 2, 25);
    expect(save.unlocked).toBe(2);
    save = recordWin(save, 1, 1, 25).save;
    expect(save.stars[1]).toBe(2);
    expect(save.unlocked).toBe(2);
  });

  it('pays the 3-star bonus once per level', () => {
    const first = recordWin({ ...freshSave(), coins: 10 }, 3, 3, 25);
    expect(first.bonus).toBe(25);
    expect(first.save.coins).toBe(35);
    const again = recordWin(first.save, 3, 3, 25);
    expect(again.bonus).toBe(0);
    expect(again.save.coins).toBe(35);
  });

  it('does not unlock past the last level', () => {
    const { save } = recordWin({ ...freshSave(), unlocked: 25 }, 25, 1, 25);
    expect(save.unlocked).toBe(25);
    expect(save.stars[25]).toBe(1);
  });
});

describe('mergeSessionIntoSave', () => {
  // Another tab's newer progress: 777 coins, levels 1-5 at 3 stars with their bonus paid, level 6 open.
  const newer: SaveV1 = {
    version: 1,
    coins: 777,
    unlocked: 6,
    stars: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
    threeStarBonusPaid: [1, 2, 3, 4, 5],
  };

  it('keeps a newer save written by another tab when a stale tab persists a zero delta', () => {
    // Tab X dealt from the old 100-coin save and earned/spent nothing; tab Y then wrote `newer`.
    const { save, bonus } = mergeSessionIntoSave(newer, 100, 100);
    expect(save).toEqual(newer);
    expect(bonus).toBe(0);
  });

  it('applies only a stale tab\'s negative delta on top of the newer save', () => {
    // Tab X started at 100 and spent 25 on a wild; the stored save is Y's 777.
    const { save } = mergeSessionIntoSave(newer, 100, 75);
    expect(save).toEqual({ ...newer, coins: 752 });
  });

  it('never lowers stars or unlocked when a stale tab records a weaker win', () => {
    // Tab X wins level 1 at 2 stars, earning 40 coins; the stored save already has level 1 at 3 and level 6 open.
    const { save, bonus } = mergeSessionIntoSave(newer, 100, 140, { levelId: 1, stars: 2, levelCount: 25 });
    expect(bonus).toBe(0);
    expect(save).toEqual({ ...newer, coins: 817 });
  });

  it('applies both deltas when two tabs from the same baseline persist one after the other', () => {
    let stored = freshSave(); // 100 coins
    // Tab X: 100 -> 130, persists first.
    stored = mergeSessionIntoSave(stored, 100, 130).save;
    expect(stored.coins).toBe(130);
    // Tab Y also dealt from 100: spends 10, then wins level 1 at 3 stars on 90 + 40 = 130.
    stored = mergeSessionIntoSave(stored, 100, 130, { levelId: 1, stars: 3, levelCount: 25 }).save;
    // 130 (X) + 30 (Y's delta) + 25 (3-star bonus)
    expect(stored).toEqual({ version: 1, coins: 185, unlocked: 2, stars: { 1: 3 }, threeStarBonusPaid: [1] });
  });

  it('pays the 3-star bonus once when two tabs win the same level at 3 stars', () => {
    const win = { levelId: 2, stars: 3, levelCount: 25 } as const;
    let stored: SaveV1 = { ...freshSave(), unlocked: 2, stars: { 1: 1 } };
    // Both tabs dealt level 2 from 100 coins and won with 150.
    const x = mergeSessionIntoSave(stored, 100, 150, win);
    expect(x.bonus).toBe(25);
    stored = x.save;
    expect(stored.coins).toBe(175);
    const y = mergeSessionIntoSave(stored, 100, 150, win);
    expect(y.bonus).toBe(0);
    expect(y.save).toEqual({ version: 1, coins: 225, unlocked: 3, stars: { 1: 1, 2: 3 }, threeStarBonusPaid: [2] });
  });

  it('does not double-count coins across repeated persists when the baseline moves to the session wallet', () => {
    let stored = freshSave(); // 100
    let baseline = 100;
    const persist = (sessionCoins: number): void => {
      stored = mergeSessionIntoSave(stored, baseline, sessionCoins).save;
      baseline = sessionCoins;
    };
    persist(60); // spent 40, tab hidden
    persist(60); // pagehide
    persist(60); // Back
    expect(stored.coins).toBe(60);
    persist(90); // earned 30 more after coming back
    persist(90);
    expect(stored.coins).toBe(90);
  });

  it('adds nothing after a win once the baseline moved to the winning wallet', () => {
    const won = mergeSessionIntoSave(freshSave(), 100, 150, { levelId: 1, stars: 3, levelCount: 25 }).save;
    expect(won.coins).toBe(175);
    // Back/hidden after the win: the session wallet is still the pre-bonus 150, and so is the baseline.
    expect(mergeSessionIntoSave(won, 150, 150).save).toEqual(won);
  });

  it('clamps coins at 0 when two tabs spent the same coins', () => {
    // Tab Y already spent the whole 30 stored coins; stale tab X spends 30 of its own copy too.
    const { save } = mergeSessionIntoSave({ ...freshSave(), coins: 0 }, 30, 0);
    expect(save.coins).toBe(0);
  });
});

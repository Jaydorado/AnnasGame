import { describe, expect, it } from 'vitest';
import { freshSave, loadSave, parseSave, recordWin, SAVE_KEY, withCoins, writeSave } from './save';

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
    const first = recordWin(withCoins(freshSave(), 10), 3, 3, 25);
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

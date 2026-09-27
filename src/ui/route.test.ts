import { describe, expect, it } from 'vitest';
import { entryFor, navigate, restore, type Progress } from './route';

const MAP = { kind: 'map' } as const;
const FINAL = { kind: 'final' } as const;
const level = (id: number) => ({ kind: 'level', id }) as const;

/** 25 levels, 7 unlocked, the last level not won yet. */
const midGame: Progress = { levelCount: 25, unlocked: 7, finalOpen: false };
const allWon: Progress = { levelCount: 25, unlocked: 25, finalOpen: true };

describe('navigate (in-app moves)', () => {
  it('pushes one entry when a level opens from the map', () => {
    expect(navigate(level(3), null, false)).toEqual({ show: level(3), op: 'push', entry: entryFor(level(3)) });
  });

  it('pushes one entry when the final screen opens from the map', () => {
    expect(navigate(FINAL, null, false)).toEqual({ show: FINAL, op: 'push', entry: entryFor(FINAL) });
  });

  it('replaces the level entry with the next level, so the map stays one step back', () => {
    expect(navigate(level(4), entryFor(level(3)), false)).toEqual({ show: level(4), op: 'replace', entry: entryFor(level(4)) });
  });

  it('replaces the last level entry with the final screen on the last win', () => {
    expect(navigate(FINAL, entryFor(level(25)), false)).toEqual({ show: FINAL, op: 'replace', entry: entryFor(FINAL) });
  });

  it.each([
    ['a level', entryFor(level(3))],
    ['the final screen', entryFor(FINAL)],
  ])('goes back in history, without showing the map itself, when leaving %s the app pushed', (_, current) => {
    expect(navigate(MAP, current, false)).toEqual({ show: null, op: 'back', entry: null });
  });

  it.each([null, undefined, { some: 'other state' }, 'level'])(
    'shows the map directly and leaves history alone when the current entry %j was not pushed by the app',
    (current) => {
      expect(navigate(MAP, current, false)).toEqual({ show: MAP, op: 'none', entry: null });
    },
  );

  it.each([MAP, level(4), FINAL])('does nothing while a Back is still on its way (no second back, no push): %j', (to) => {
    expect(navigate(to, entryFor(level(3)), true)).toEqual({ show: null, op: 'none', entry: null });
  });
});

describe('restore (popstate and boot)', () => {
  it.each([null, undefined, { some: 'other state' }, 42])('shows the map for a map or foreign entry %j', (state) => {
    expect(restore(state, midGame)).toEqual({ show: MAP, op: 'none', entry: null });
  });

  it('lands on the level of a playable level entry (reload on a level)', () => {
    expect(restore(entryFor(level(7)), midGame)).toEqual({ show: level(7), op: 'none', entry: null });
    expect(restore(entryFor(level(1)), midGame)).toEqual({ show: level(1), op: 'none', entry: null });
  });

  it('lands on the final screen of a final entry once the last level is won', () => {
    expect(restore(entryFor(FINAL), allWon)).toEqual({ show: FINAL, op: 'none', entry: null });
  });

  it.each([
    ['a locked level', entryFor(level(8)), midGame],
    ['level 0', entryFor(level(0)), allWon],
    ['a level past the last', entryFor(level(26)), allWon],
    ['a fractional level', entryFor(level(2.5)), allWon],
    ['a non-numeric level', { ...entryFor(level(1)), level: '3' }, allWon],
    ['an unknown app screen', { ...entryFor(FINAL), tripeaks: 'shop' }, allWon],
    ['a final entry before the last level is won', entryFor(FINAL), midGame],
  ])('shows the map and steps back onto the map entry for %s', (_, state, progress) => {
    expect(restore(state, progress)).toEqual({ show: MAP, op: 'back', entry: null });
  });
});

describe('entryFor', () => {
  it('keeps the map off history: it has no entry of its own', () => {
    expect(entryFor(MAP)).toBeNull();
  });

  it('round-trips a level and the final screen through restore', () => {
    const state = structuredClone(entryFor(level(5)));
    expect(restore(state, midGame).show).toEqual(level(5));
    expect(restore(structuredClone(entryFor(FINAL)), allWon).show).toEqual(FINAL);
  });
});

# TriPeaks Solitaire PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cat-themed, earn-only TriPeaks solitaire PWA with 25 solver-verified levels, installable on Android from `https://jaydorado.github.io/AnnasGame/`.

**Architecture:** Pure, deterministic TypeScript game core (`src/core/`: cards, seeded RNG, layouts, immutable reducer, solver) with Vitest coverage; versioned localStorage save (`src/progress/`); a thin DOM/CSS UI (`src/ui/`) that dispatches actions to the reducer and animates the diff; `vite-plugin-pwa` for install/offline; GitHub Actions deploys to Pages.

**Tech Stack:** TypeScript (strict), Vite, Vitest, tsx (dev scripts), vite-plugin-pwa, @vite-pwa/assets-generator, GitHub Actions + Pages. No UI framework, no game engine.

**Spec:** `docs/superpowers/specs/2026-09-26-tripeaks-solitaire-pwa-design.md`

## Global Constraints

- **No pay, no wait:** no store, lives/energy, timers, countdowns, daily caps, ads, or premium currency anywhere in UI or code. Retry is instant and free; losing never costs coins.
- **Every shipped level winnable without boosters**, enforced by `src/levels/levels.test.ts`.
- **No Disney IP**: all art is our own code-drawn SVG, cat-themed.
- `src/core/` never imports from `src/ui/` or touches DOM, timers, or `Math.random`.
- Target Android Chrome, portrait, viewport ≥ 360×640 CSS px; touch targets ≥ 44 CSS px.
- Economy constants (exact): start 100; +1 per table card; streak bonus = streak on multiples of 5; win +20; +2 per stock card left at win; first 3-star +25 once per level; Undo 5; Wild 25; +5 cards 30.
- Save key `tripeaks.save`, schema `SaveV1` (spec). Invalid/unknown → fresh save.
- Vite `base` from env `VITE_BASE` (CI: `/AnnasGame/`); default `/`.
- Manifest name "Solitaire Dreams", short name "Solitaire", `display: standalone`, `orientation: portrait`.
- Credit line on final screen: `"Made with ♥ for Anna"` (in `src/config.ts`).
- Work on branch `v1`; merge to `main` only at the end (push to `main` deploys).
- Windows dev box: run shell scripts as `bash path/to/script`; npm scripts work as-is.

## File Map

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore       Task 1 (vite.config.ts extended in Task 10)
src/core/cards.ts (+ .test.ts)                                            Task 1
src/core/rng.ts (+ .test.ts)                                              Task 1
src/core/layout.ts, src/core/layouts.ts, src/core/layout.test.ts           Task 2
src/core/level.ts, src/core/economy.ts (+ .test.ts)                        Task 3
src/core/game.ts (+ .test.ts)                                              Task 3
src/core/solver.ts (+ .test.ts)                                            Task 4
src/progress/save.ts (+ .test.ts)                                          Task 5
tools/findSeeds.ts, src/levels/levels.ts (+ .test.ts)                      Task 6
src/ui/art/*.ts, src/ui/styles.css, gallery.html                           Task 7
src/config.ts, src/ui/board.ts, hud.ts, dialogs.ts, fx.ts, levelScreen.ts  Task 8
src/ui/map.ts, src/ui/finalScreen.ts, src/main.ts                          Task 9
public/icon.svg, public/*.png, .github/workflows/deploy.yml                Task 10
```

Order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10. Task 7 depends only on Task 1 and may run in parallel with 2–6.

---

### Task 1: Project scaffold, cards, seeded RNG

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts`
- Create: `src/core/cards.ts`, `src/core/cards.test.ts`, `src/core/rng.ts`, `src/core/rng.test.ts`

**Interfaces:**
- Produces: `Suit`, `Card`, `Top`, `RANK_LABELS`, `ranksAdjacent(a, b)`, `canPlay(card, top)`, `fullDeck()` from `src/core/cards.ts`; `mulberry32(seed)`, `shuffle(items, rand)` from `src/core/rng.ts`.

- [ ] **Step 1: Create branch and scaffold**

```bash
git checkout -b v1
npm init -y
npm install -D typescript vite vitest tsx @types/node
```

Overwrite `package.json` scripts/type (keep the installed devDependencies block as npm wrote it):

```json
{
  "name": "annas-game",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "seeds": "tsx tools/findSeeds.ts"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tools", "vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  test: { include: ['src/**/*.test.ts'] },
});
```

`.gitignore`:

```
node_modules/
dist/
dev-dist/
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#141d3b" />
    <title>Solitaire Dreams</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts` (placeholder entry replaced in Task 8/9; it must compile):

```ts
document.querySelector<HTMLDivElement>('#app')!.textContent = 'Solitaire Dreams';
```

- [ ] **Step 2: Write failing tests**

`src/core/cards.test.ts`:

```ts
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
```

`src/core/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, shuffle } from './rng';

describe('mulberry32', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });
  it('returns values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  const items = Array.from({ length: 52 }, (_, i) => i);
  it('returns a permutation and leaves the input untouched', () => {
    const copy = items.slice();
    const out = shuffle(items, mulberry32(1));
    expect(items).toEqual(copy);
    expect(out.slice().sort((x, y) => x - y)).toEqual(items);
  });
  it('is deterministic per seed and differs across seeds', () => {
    expect(shuffle(items, mulberry32(5))).toEqual(shuffle(items, mulberry32(5)));
    expect(shuffle(items, mulberry32(5))).not.toEqual(shuffle(items, mulberry32(6)));
  });
});
```

- [ ] **Step 3: Run tests, expect failure**

Run: `npm test`
Expected: FAIL — cannot resolve `./cards` / `./rng`.

- [ ] **Step 4: Implement**

`src/core/cards.ts`:

```ts
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
```

`src/core/rng.ts`:

```ts
/** Deterministic PRNG; returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test` → all PASS. Run: `npx tsc --noEmit` → no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(core): scaffold, cards, seeded rng"
```

---

### Task 2: Layouts

**Files:**
- Create: `src/core/layout.ts`, `src/core/layouts.ts`, `src/core/layout.test.ts`

**Interfaces:**
- Consumes: `Card` from `src/core/cards.ts`.
- Produces: `LayoutId`, `Slot`, `Layout`, `buildLayout(id, rows)`, `isExposed(slot, table)` from `layout.ts`; `LAYOUTS: Record<LayoutId, Layout>` from `layouts.ts`.

Geometry rule: a layout is a list of rows of x positions (card-width units, min x = 0). Slots are numbered row by row, left to right as listed. A slot is covered by every slot in the **next** row whose x differs by exactly 0.5. Later rows are drawn on top (closer to the player). The last row is uncovered.

- [ ] **Step 1: Write failing tests**

`src/core/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Card } from './cards';
import { buildLayout, isExposed, type LayoutId } from './layout';
import { LAYOUTS } from './layouts';

const c = (rank: number): Card => ({ rank, suit: 0 });

describe('LAYOUTS', () => {
  it.each([
    ['threePeaks', 28],
    ['pyramid', 21],
    ['diamond', 25],
    ['twinPeaks', 20],
    ['wall', 28],
  ] as [LayoutId, number][])('%s has %i slots', (id, n) => {
    expect(LAYOUTS[id].slots).toHaveLength(n);
  });

  it('covers come only from the next row at x ± 0.5; only the last row is uncovered', () => {
    for (const layout of Object.values(LAYOUTS)) {
      layout.slots.forEach((slot) => {
        if (slot.row === layout.rows - 1) {
          expect(slot.coveredBy).toEqual([]);
        } else {
          expect(slot.coveredBy.length).toBeGreaterThan(0);
          for (const i of slot.coveredBy) {
            expect(layout.slots[i].row).toBe(slot.row + 1);
            expect(Math.abs(layout.slots[i].x - slot.x)).toBe(0.5);
          }
        }
      });
    }
  });

  it('threePeaks first peak is covered by slots 3 and 4', () => {
    expect(LAYOUTS.threePeaks.slots[0].coveredBy).toEqual([3, 4]);
  });
});

describe('isExposed', () => {
  it('exposes a slot only when all covering slots are removed', () => {
    const layout = buildLayout('pyramid', [[0.5], [0, 1]]);
    const table: (Card | null)[] = [c(1), c(2), c(3)];
    expect(isExposed(layout.slots[0], table)).toBe(false);
    expect(isExposed(layout.slots[1], table)).toBe(true);
    table[1] = null;
    expect(isExposed(layout.slots[0], table)).toBe(false);
    table[2] = null;
    expect(isExposed(layout.slots[0], table)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npm test -- src/core/layout.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

`src/core/layout.ts`:

```ts
import type { Card } from './cards';

export type LayoutId = 'threePeaks' | 'pyramid' | 'diamond' | 'twinPeaks' | 'wall';

export interface Slot {
  readonly x: number; // card-width units
  readonly row: number; // 0 = back row
  readonly coveredBy: readonly number[]; // slot indices in row + 1
}

export interface Layout {
  readonly id: LayoutId;
  readonly slots: readonly Slot[];
  readonly width: number; // in card widths
  readonly rows: number;
}

export function buildLayout(id: LayoutId, rows: readonly (readonly number[])[]): Layout {
  const flat = rows.flatMap((xs, row) => xs.map((x) => ({ x, row })));
  const slots = flat.map((s) => ({
    ...s,
    coveredBy: flat.flatMap((o, i) => (o.row === s.row + 1 && Math.abs(o.x - s.x) === 0.5 ? [i] : [])),
  }));
  return { id, slots, width: Math.max(...flat.map((s) => s.x)) + 1, rows: rows.length };
}

export function isExposed(slot: Slot, table: readonly (Card | null)[]): boolean {
  return slot.coveredBy.every((i) => table[i] === null);
}
```

`src/core/layouts.ts`:

```ts
import { buildLayout, type Layout, type LayoutId } from './layout';

const range = (start: number, count: number): number[] => Array.from({ length: count }, (_, i) => start + i);
/** Centered row of n cards in a layout max cards wide. */
const centered = (n: number, max: number): number[] => range((max - n) / 2, n);

export const LAYOUTS: Record<LayoutId, Layout> = {
  threePeaks: buildLayout('threePeaks', [[1.5, 4.5, 7.5], [1, 2, 4, 5, 7, 8], range(0.5, 9), range(0, 10)]),
  pyramid: buildLayout('pyramid', [1, 2, 3, 4, 5, 6].map((n) => centered(n, 6))),
  diamond: buildLayout('diamond', [1, 2, 3, 4, 5, 4, 3, 2, 1].map((n) => centered(n, 5))),
  twinPeaks: buildLayout('twinPeaks', [[1.5, 5.5], [1, 2, 5, 6], [0.5, 1.5, 2.5, 4.5, 5.5, 6.5], range(0, 8)]),
  wall: buildLayout('wall', [range(0, 6), range(0.5, 5), range(0, 6), range(0.5, 5), range(0, 6)]),
};
```

- [ ] **Step 4: Run tests** — `npm test` → PASS; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(core): layouts and cover graph"`

---

### Task 3: Level type, economy, game reducer

**Files:**
- Create: `src/core/level.ts`, `src/core/economy.ts`, `src/core/economy.test.ts`, `src/core/game.ts`, `src/core/game.test.ts`

**Interfaces:**
- Consumes: Task 1 (`Card`, `Suit`, `Top`, `canPlay`, `fullDeck`, `mulberry32`, `shuffle`), Task 2 (`Layout`, `isExposed`, `LAYOUTS`, `LayoutId`).
- Produces:
  - `LevelDef` (`level.ts`): `{ id; layoutId: LayoutId; seed; stockSize; star2; star3 }`, all `readonly number` except `layoutId`.
  - `ECON`, `streakBonus(streak): number`, `starsFor(level, stockLeft): 1 | 2 | 3` (`economy.ts`).
  - `Status = 'playing' | 'won' | 'stuck'`; `Action = {type:'play', slot} | {type:'draw'} | {type:'wild'} | {type:'addFive'} | {type:'undo'}`; `GameState` (fields below); `createState(level, layout, table, stock, first, coins)`, `deal(level, coins)`, `reduce(state, action)`, `top(state)`, `playable(state): number[]` (`game.ts`).
  - Contract: `reduce` returns **the same object** when the action is not allowed. UI uses `reduce(s, a) !== s` to enable buttons.

Rules recap (from spec): stock's last element is the next draw; discard's last element is the top; `+5` prepends (bottom of stock). Undo is allowed after a Play or Draw (chainable), never after a booster, never once won; it reverts the board and the undone move's coins and costs 5.

- [ ] **Step 1: Write failing economy tests**

`src/core/economy.test.ts`:

```ts
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
```

- [ ] **Step 2: Write failing game tests**

`src/core/game.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Card, Suit } from './cards';
import { buildLayout } from './layout';
import type { LevelDef } from './level';
import { createState, deal, playable, reduce, top, type GameState } from './game';

const c = (rank: number, suit: Suit = 0): Card => ({ rank, suit });
// Slot 0 is behind slots 1 and 2.
const tiny = buildLayout('pyramid', [[0.5], [0, 1]]);
const level: LevelDef = { id: 1, layoutId: 'pyramid', seed: 42, stockSize: 3, star2: 1, star3: 2 };
/** Stock last element is the next draw. */
const start = (table: number[], stock: number[] = [1, 2], first = 4, coins = 100): GameState =>
  createState(level, tiny, table.map((r) => c(r)), stock.map((r) => c(r)), c(first), coins);
const play = (s: GameState, slot: number) => reduce(s, { type: 'play', slot });
const draw = (s: GameState) => reduce(s, { type: 'draw' });
const undo = (s: GameState) => reduce(s, { type: 'undo' });
const wild = (s: GameState) => reduce(s, { type: 'wild' });
const addFive = (s: GameState) => reduce(s, { type: 'addFive' });
const topRank = (s: GameState) => {
  const t = top(s);
  return t === 'wild' ? 'wild' : t.rank;
};
/** 9 behind 5 and 6; top 4; stock [A, 2]. Play 5, 6, draw 2, draw A → stuck. */
const stuckState = () => draw(draw(play(play(start([9, 5, 6]), 1), 2)));

describe('play', () => {
  it('moves an exposed adjacent card to the discard and earns a coin', () => {
    const n = play(start([9, 5, 6]), 1);
    expect(n.table[1]).toBeNull();
    expect(topRank(n)).toBe(5);
    expect(n.streak).toBe(1);
    expect(n.coins).toBe(101);
    expect(n.status).toBe('playing');
  });

  it('rejects covered, non-adjacent, and already-played slots', () => {
    const s = start([9, 5, 6]);
    expect(play(s, 0)).toBe(s); // covered
    expect(play(s, 2)).toBe(s); // 6 on 4
    const n = play(s, 1);
    expect(play(n, 1)).toBe(n); // empty
    expect(play(s, 99)).toBe(s);
  });

  it('lists playable slots', () => {
    expect(playable(start([9, 5, 6]))).toEqual([1]);
  });

  it('wins when the table is empty and pays win + stock bonus', () => {
    const won = play(play(play(start([7, 5, 6]), 1), 2), 0);
    expect(won.status).toBe('won');
    expect(won.coins).toBe(100 + 3 + 20 + 2 * 2);
  });

  it('pays the streak bonus on the 5th consecutive play', () => {
    const row = buildLayout('wall', [[0, 1, 2, 3, 4]]);
    let s = createState(level, row, [5, 6, 7, 8, 9].map((r) => c(r)), [c(1), c(2)], c(4), 100);
    for (let i = 0; i < 5; i++) s = play(s, i);
    expect(s.status).toBe('won');
    expect(s.coins).toBe(100 + 5 + 5 + 20 + 2 * 2);
  });
});

describe('draw', () => {
  it('flips the next stock card and resets the streak', () => {
    const n = draw(play(start([9, 5, 6]), 1));
    expect(topRank(n)).toBe(2);
    expect(n.stock).toHaveLength(1);
    expect(n.streak).toBe(0);
  });

  it('becomes stuck with an empty stock and no playable card', () => {
    const s = stuckState();
    expect(s.status).toBe('stuck');
    expect(draw(s)).toBe(s);
  });
});

describe('wild', () => {
  it('costs 25, keeps the streak, and accepts any card', () => {
    const p = play(start([9, 5, 6]), 1);
    const w = wild(p);
    expect(w.coins).toBe(p.coins - 25);
    expect(w.streak).toBe(1);
    expect(topRank(w)).toBe('wild');
    expect(topRank(play(w, 2))).toBe(6);
  });

  it('rescues a stuck game', () => {
    const w = wild(stuckState());
    expect(w.status).toBe('playing');
    expect(play(w, 0).status).toBe('won');
  });

  it('is rejected when unaffordable or when a wild is already on top', () => {
    const poor = start([9, 5, 6], [1, 2], 4, 24);
    expect(wild(poor)).toBe(poor);
    const w = wild(start([9, 5, 6]));
    expect(wild(w)).toBe(w);
  });
});

describe('addFive', () => {
  it('costs 30, adds 5 cards under the stock, and unsticks the game', () => {
    const s = stuckState();
    const a = addFive(s);
    expect(a.coins).toBe(s.coins - 30);
    expect(a.stock).toHaveLength(5);
    expect(a.fiveUses).toBe(1);
    expect(a.status).toBe('playing');
  });

  it('is deterministic for the same state', () => {
    const s = stuckState();
    expect(addFive(s).stock).toEqual(addFive(s).stock);
  });

  it('keeps existing stock on top', () => {
    const s = start([9, 5, 6]);
    const a = addFive(s);
    expect(a.stock.slice(5)).toEqual(s.stock);
  });

  it('works on a full 52-card deal', () => {
    const d = deal({ id: 1, layoutId: 'threePeaks', seed: 7, stockSize: 24, star2: 1, star3: 2 }, 100);
    expect(addFive(d).stock).toHaveLength(23 + 5);
  });

  it('is rejected when unaffordable', () => {
    const poor = start([9, 5, 6], [1, 2], 4, 29);
    expect(addFive(poor)).toBe(poor);
  });
});

describe('undo', () => {
  it('reverts a play and its coin, costing 5', () => {
    const s = start([9, 5, 6]);
    const u = undo(play(s, 1));
    expect(u.table).toEqual(s.table);
    expect(topRank(u)).toBe(4);
    expect(u.streak).toBe(0);
    expect(u.coins).toBe(95);
  });

  it('chains across several moves without refunding earlier undo costs', () => {
    const s = start([9, 5, 6]);
    const u = undo(undo(play(play(s, 1), 2)));
    expect(u.table).toEqual(s.table);
    expect(u.coins).toBe(90);
  });

  it('reverts a draw', () => {
    const s = start([9, 5, 6]);
    const u = undo(draw(s));
    expect(u.stock).toEqual(s.stock);
    expect(topRank(u)).toBe(4);
  });

  it('is rejected after a booster, after a win, with no history, or when unaffordable', () => {
    const w = wild(play(start([9, 5, 6]), 1));
    expect(undo(w)).toBe(w);
    const won = play(play(play(start([7, 5, 6]), 1), 2), 0);
    expect(undo(won)).toBe(won);
    const fresh = start([9, 5, 6]);
    expect(undo(fresh)).toBe(fresh);
    const poor = play(start([9, 5, 6], [1, 2], 4, 3), 1);
    expect(undo(poor)).toBe(poor);
  });
});

describe('deal', () => {
  const lvl: LevelDef = { id: 1, layoutId: 'threePeaks', seed: 99, stockSize: 24, star2: 1, star3: 2 };

  it('is deterministic per seed', () => {
    const a = deal(lvl, 0);
    const b = deal(lvl, 0);
    expect(a.table).toEqual(b.table);
    expect(a.stock).toEqual(b.stock);
    expect(a.discard).toEqual(b.discard);
    expect(deal({ ...lvl, seed: 100 }, 0).table).not.toEqual(a.table);
  });

  it('fills slots, stock minus one, and one discard from 52 distinct cards', () => {
    const d = deal(lvl, 0);
    expect(d.table).toHaveLength(28);
    expect(d.stock).toHaveLength(23);
    expect(d.discard).toHaveLength(1);
    const all = [...d.table, ...d.stock, ...d.discard] as Card[];
    expect(new Set(all.map((x) => `${x.rank}-${x.suit}`)).size).toBe(52);
  });

  it('throws when the level needs more than 52 cards', () => {
    expect(() => deal({ ...lvl, stockSize: 25 }, 0)).toThrow();
  });
});
```

- [ ] **Step 3: Run, expect failure** — `npm test` → FAIL (modules missing).

- [ ] **Step 4: Implement**

`src/core/level.ts`:

```ts
import type { LayoutId } from './layout';

export interface LevelDef {
  readonly id: number;
  readonly layoutId: LayoutId;
  readonly seed: number;
  readonly stockSize: number; // includes the card flipped to the discard at deal
  readonly star2: number;
  readonly star3: number;
}
```

`src/core/economy.ts`:

```ts
import type { LevelDef } from './level';

export const ECON = {
  startCoins: 100,
  perCard: 1,
  winBonus: 20,
  perStockLeft: 2,
  threeStarBonus: 25,
  undoCost: 5,
  wildCost: 25,
  addFiveCost: 30,
  addFiveCount: 5,
} as const;

export function streakBonus(streak: number): number {
  return streak > 0 && streak % 5 === 0 ? streak : 0;
}

export function starsFor(level: Pick<LevelDef, 'star2' | 'star3'>, stockLeft: number): 1 | 2 | 3 {
  if (stockLeft >= level.star3) return 3;
  if (stockLeft >= level.star2) return 2;
  return 1;
}
```

`src/core/game.ts`:

```ts
import { canPlay, fullDeck, type Card, type Suit, type Top } from './cards';
import { ECON, streakBonus } from './economy';
import { isExposed, type Layout } from './layout';
import { LAYOUTS } from './layouts';
import type { LevelDef } from './level';
import { mulberry32, shuffle } from './rng';

export type Status = 'playing' | 'won' | 'stuck';

export type Action =
  | { readonly type: 'play'; readonly slot: number }
  | { readonly type: 'draw' }
  | { readonly type: 'wild' }
  | { readonly type: 'addFive' }
  | { readonly type: 'undo' };

export interface GameState {
  readonly level: LevelDef;
  readonly layout: Layout;
  readonly table: readonly (Card | null)[];
  readonly stock: readonly Card[]; // last = next draw
  readonly discard: readonly Top[]; // last = top
  readonly streak: number;
  readonly coins: number; // wallet total, live
  readonly fiveUses: number;
  readonly lastEarned: number; // coins earned by the move that produced this state
  readonly status: Status;
  readonly undoTo: GameState | null; // state before the last Play/Draw
}

function statusOf(layout: Layout, table: readonly (Card | null)[], stock: readonly Card[], t: Top): Status {
  if (table.every((card) => card === null)) return 'won';
  if (stock.length > 0 || t === 'wild') return 'playing';
  const canMove = table.some((card, i) => card !== null && isExposed(layout.slots[i], table) && canPlay(card, t));
  return canMove ? 'playing' : 'stuck';
}

export function createState(
  level: LevelDef,
  layout: Layout,
  table: readonly Card[],
  stock: readonly Card[],
  first: Card,
  coins: number,
): GameState {
  return {
    level,
    layout,
    table: [...table],
    stock: [...stock],
    discard: [first],
    streak: 0,
    coins,
    fiveUses: 0,
    lastEarned: 0,
    status: statusOf(layout, table, stock, first),
    undoTo: null,
  };
}

export function deal(level: LevelDef, coins: number): GameState {
  const layout = LAYOUTS[level.layoutId];
  const n = layout.slots.length;
  if (level.stockSize < 1 || n + level.stockSize > 52) {
    throw new Error(`Level ${level.id}: ${n} slots + ${level.stockSize} stock does not fit one deck`);
  }
  const deck = shuffle(fullDeck(), mulberry32(level.seed));
  const stock = deck.slice(n, n + level.stockSize);
  const first = stock.pop()!;
  return createState(level, layout, deck.slice(0, n), stock, first, coins);
}

export function top(s: GameState): Top {
  return s.discard[s.discard.length - 1];
}

export function playable(s: GameState): number[] {
  if (s.status === 'won') return [];
  const t = top(s);
  return s.table.flatMap((card, i) => (card && isExposed(s.layout.slots[i], s.table) && canPlay(card, t) ? [i] : []));
}

export function reduce(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'play': {
      const card = s.table[a.slot];
      if (s.status !== 'playing' || !card || !isExposed(s.layout.slots[a.slot], s.table) || !canPlay(card, top(s))) {
        return s;
      }
      const table = s.table.slice();
      table[a.slot] = null;
      const streak = s.streak + 1;
      const status = statusOf(s.layout, table, s.stock, card);
      let earned = ECON.perCard + streakBonus(streak);
      if (status === 'won') earned += ECON.winBonus + ECON.perStockLeft * s.stock.length;
      return {
        ...s,
        table,
        discard: [...s.discard, card],
        streak,
        coins: s.coins + earned,
        lastEarned: earned,
        status,
        undoTo: s,
      };
    }
    case 'draw': {
      if (s.status !== 'playing' || s.stock.length === 0) return s;
      const card = s.stock[s.stock.length - 1];
      const stock = s.stock.slice(0, -1);
      return {
        ...s,
        stock,
        discard: [...s.discard, card],
        streak: 0,
        lastEarned: 0,
        status: statusOf(s.layout, s.table, stock, card),
        undoTo: s,
      };
    }
    case 'wild': {
      if (s.status === 'won' || s.coins < ECON.wildCost || top(s) === 'wild') return s;
      return {
        ...s,
        discard: [...s.discard, 'wild'],
        coins: s.coins - ECON.wildCost,
        lastEarned: 0,
        status: 'playing',
        undoTo: null,
      };
    }
    case 'addFive': {
      if (s.status === 'won' || s.coins < ECON.addFiveCost) return s;
      const rand = mulberry32(s.level.seed + s.fiveUses + 1);
      const extra: Card[] = Array.from({ length: ECON.addFiveCount }, () => ({
        rank: 1 + Math.floor(rand() * 13),
        suit: Math.floor(rand() * 4) as Suit,
      }));
      const stock = [...extra, ...s.stock];
      return {
        ...s,
        stock,
        coins: s.coins - ECON.addFiveCost,
        fiveUses: s.fiveUses + 1,
        lastEarned: 0,
        status: statusOf(s.layout, s.table, stock, top(s)),
        undoTo: null,
      };
    }
    case 'undo': {
      const prev = s.undoTo;
      if (!prev || s.status === 'won') return s;
      const coins = s.coins - s.lastEarned - ECON.undoCost;
      if (coins < 0) return s;
      return { ...prev, coins };
    }
  }
}
```

- [ ] **Step 5: Run tests** — `npm test` → PASS; `npx tsc --noEmit` clean.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(core): level type, economy, game reducer"`

---

### Task 4: Solver

**Files:**
- Create: `src/core/solver.ts`, `src/core/solver.test.ts`

**Interfaces:**
- Consumes: `ranksAdjacent`, `Card` (Task 1); `Layout` (Task 2); `LevelDef`, `deal`, `top` (Task 3).
- Produces: `SolveResult { winnable: boolean; bestStockLeft: number }` (`bestStockLeft = -1` when not winnable); `solveDeal(layout, table, stock, first)`; `solveLevel(level)`.

Boosterless memoized DFS over (removed bitmask, stock length, top rank). Max table size 30. Must use `ranksAdjacent` (same rule as the reducer).

- [ ] **Step 1: Write failing tests**

`src/core/solver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Card } from './cards';
import { buildLayout } from './layout';
import { solveDeal, solveLevel } from './solver';

const c = (rank: number): Card => ({ rank, suit: 0 });
const tiny = buildLayout('pyramid', [[0.5], [0, 1]]);
const solve = (table: number[], stock: number[], first: number) =>
  solveDeal(tiny, table.map(c), stock.map(c), c(first));

describe('solveDeal', () => {
  it('wins a chain without drawing', () => {
    expect(solve([7, 5, 6], [], 4)).toEqual({ winnable: true, bestStockLeft: 0 });
  });
  it('reports an unwinnable deal', () => {
    expect(solve([9, 5, 6], [], 4)).toEqual({ winnable: false, bestStockLeft: -1 });
  });
  it('draws from the stock when needed', () => {
    expect(solve([9, 5, 6], [8], 4)).toEqual({ winnable: true, bestStockLeft: 0 });
  });
  it('maximizes cards left in the stock', () => {
    expect(solve([7, 5, 6], [3], 4)).toEqual({ winnable: true, bestStockLeft: 1 });
  });
  it('treats king and ace as adjacent', () => {
    expect(solve([2, 13, 1], [], 12)).toEqual({ winnable: true, bestStockLeft: 0 });
  });
});

describe('solveLevel', () => {
  it('solves a real deal deterministically', () => {
    const lvl = { id: 1, layoutId: 'pyramid', seed: 3, stockSize: 22, star2: 1, star3: 2 } as const;
    expect(solveLevel(lvl)).toEqual(solveLevel(lvl));
  });
});
```

(`[2, 13, 1]` with top 12: play K (13) on Q, A (1) on K, then 2 on A.)

- [ ] **Step 2: Run, expect failure** — `npm test -- src/core/solver.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`src/core/solver.ts`:

```ts
import { ranksAdjacent, type Card } from './cards';
import { deal, top } from './game';
import type { Layout } from './layout';
import type { LevelDef } from './level';

export interface SolveResult {
  readonly winnable: boolean;
  readonly bestStockLeft: number; // -1 when not winnable
}

export function solveDeal(layout: Layout, table: readonly Card[], stock: readonly Card[], first: Card): SolveResult {
  const n = table.length;
  if (n !== layout.slots.length) throw new Error('table size does not match layout');
  if (n > 30) throw new Error('solver supports at most 30 table slots');
  if (stock.length > 63) throw new Error('solver supports at most 63 stock cards');
  const ranks = table.map((card) => card.rank);
  const stockRanks = stock.map((card) => card.rank);
  const coverMask = layout.slots.map((slot) => slot.coveredBy.reduce((m, i) => m | (1 << i), 0));
  const full = 2 ** n - 1;
  const memo = new Map<number, number>();

  const best = (removed: number, stockLen: number, topRank: number): number => {
    if (removed === full) return stockLen;
    const key = (removed * 64 + stockLen) * 16 + topRank;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    let result = -1;
    for (let i = 0; i < n && result < stockLen; i++) {
      const bit = 1 << i;
      if ((removed & bit) === 0 && (coverMask[i] & ~removed) === 0 && ranksAdjacent(ranks[i], topRank)) {
        result = Math.max(result, best(removed | bit, stockLen, ranks[i]));
      }
    }
    if (stockLen > 0 && result < stockLen - 1) {
      result = Math.max(result, best(removed, stockLen - 1, stockRanks[stockLen - 1]));
    }
    memo.set(key, result);
    return result;
  };

  const r = best(0, stock.length, first.rank);
  return { winnable: r >= 0, bestStockLeft: r };
}

export function solveLevel(level: LevelDef): SolveResult {
  const s = deal(level, 0);
  const first = top(s);
  if (first === 'wild') throw new Error('unreachable: fresh deal has a card on top');
  return solveDeal(s.layout, s.table as Card[], s.stock, first);
}
```

- [ ] **Step 4: Run tests** — PASS. Also time one worst-case: `npx tsx -e "import('./src/core/solver.ts').then(m=>{const t=Date.now();console.log(m.solveLevel({id:1,layoutId:'threePeaks',seed:1,stockSize:24,star2:1,star3:2}),Date.now()-t,'ms')})"`. Report the time in your summary. If a single solve exceeds 5 s, stop and report rather than restructuring.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(core): boosterless tripeaks solver"`

---

### Task 5: Save / progress

**Files:**
- Create: `src/progress/save.ts`, `src/progress/save.test.ts`

**Interfaces:**
- Consumes: `ECON` (Task 3).
- Produces: `SaveV1`, `Stars = 1 | 2 | 3`, `SAVE_KEY`, `freshSave()`, `parseSave(raw)`, `loadSave(storage?)`, `writeSave(save, storage?)`, `withCoins(save, coins)`, `recordWin(save, levelId, stars, levelCount): { save; bonus }`.

- [ ] **Step 1: Write failing tests**

`src/progress/save.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, expect failure** — `npm test -- src/progress` → FAIL.

- [ ] **Step 3: Implement**

`src/progress/save.ts`:

```ts
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

export function withCoins(save: SaveV1, coins: number): SaveV1 {
  return { ...save, coins };
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
```

- [ ] **Step 4: Run tests** — PASS; `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(progress): versioned save with earn-only rewards"`

---

### Task 6: Level authoring and the 25 levels

**Files:**
- Create: `tools/findSeeds.ts`, `src/levels/levels.ts`, `src/levels/levels.test.ts`

**Interfaces:**
- Consumes: `solveLevel` (Task 4), `LevelDef` (Task 3), `LayoutId`, `LAYOUTS` (Task 2).
- Produces: `LEVELS: readonly LevelDef[]` (25 entries, ids 1..25 in order) from `src/levels/levels.ts`.

- [ ] **Step 1: Write the level test (fails until levels exist)**

`src/levels/levels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../core/layouts';
import { solveLevel } from '../core/solver';
import { LEVELS } from './levels';

describe('LEVELS', () => {
  it('has 25 levels with ids 1..25 in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
  });

  it('fits every level in one deck with valid star thresholds', () => {
    for (const l of LEVELS) {
      expect(LAYOUTS[l.layoutId].slots.length + l.stockSize).toBeLessThanOrEqual(52);
      expect(l.star2).toBeGreaterThanOrEqual(1);
      expect(l.star3).toBeGreaterThan(l.star2);
    }
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))(
    'level %i is winnable without boosters and 3 stars are reachable',
    (_id, level) => {
      const r = solveLevel(level);
      expect(r.winnable).toBe(true);
      expect(level.star3).toBeLessThanOrEqual(r.bestStockLeft);
    },
    60_000,
  );
});
```

- [ ] **Step 2: Write the seed finder**

`tools/findSeeds.ts`:

```ts
import type { LayoutId } from '../src/core/layout';
import { solveLevel } from '../src/core/solver';

// [layoutId, stockSize, minBest, maxBest] per level, in map order.
const PLAN: [LayoutId, number, number, number][] = [
  ['threePeaks', 24, 8, 14], ['threePeaks', 24, 8, 14], ['threePeaks', 24, 8, 14], ['threePeaks', 24, 8, 14], ['threePeaks', 24, 8, 14],
  ['pyramid', 22, 7, 12], ['pyramid', 22, 7, 12], ['pyramid', 22, 7, 12],
  ['threePeaks', 22, 5, 9], ['threePeaks', 22, 5, 9], ['threePeaks', 22, 5, 9],
  ['twinPeaks', 20, 5, 9], ['twinPeaks', 20, 5, 9], ['twinPeaks', 20, 5, 9],
  ['diamond', 20, 4, 7], ['diamond', 20, 4, 7], ['diamond', 20, 4, 7],
  ['wall', 20, 3, 6], ['wall', 20, 3, 6], ['wall', 20, 3, 6],
  ['threePeaks', 18, 2, 4], ['threePeaks', 18, 2, 4], ['threePeaks', 18, 2, 4],
  ['wall', 16, 2, 4],
  ['diamond', 16, 2, 4],
];
const MAX_TRIES = 20_000;

const lines = PLAN.map(([layoutId, stockSize, minBest, maxBest], i) => {
  const id = i + 1;
  for (let k = 0; k < MAX_TRIES; k++) {
    const seed = id * 100_000 + k;
    const { winnable, bestStockLeft: best } = solveLevel({ id, layoutId, seed, stockSize, star2: 1, star3: 2 });
    if (winnable && best >= minBest && best <= maxBest) {
      const star3 = Math.max(2, Math.ceil(best * 0.6));
      const star2 = Math.max(1, Math.floor(star3 / 2));
      return `  { id: ${id}, layoutId: '${layoutId}', seed: ${seed}, stockSize: ${stockSize}, star2: ${star2}, star3: ${star3} }, // best ${best}`;
    }
  }
  throw new Error(`Level ${id} (${layoutId}, stock ${stockSize}): no seed in ${MAX_TRIES} tries for best in [${minBest}, ${maxBest}]`);
});

console.log(lines.join('\n'));
```

- [ ] **Step 3: Run the finder**

Run: `npm run seeds`
Expected: 25 lines printed. If a level throws, widen **only that level's** band by up to 2 on either side (keep `minBest ≥ 2`) and rerun; record every change in your report. Do not change layouts or economy.

- [ ] **Step 4: Write `src/levels/levels.ts` with the printed lines**

```ts
import type { LevelDef } from '../core/level';

/** Generated by `npm run seeds` (tools/findSeeds.ts); every level is solver-verified in levels.test.ts. */
export const LEVELS: readonly LevelDef[] = [
  // paste the 25 printed lines here verbatim, including the `// best N` comments
];
```

- [ ] **Step 5: Run tests** — `npm test` → all PASS (levels test may take up to a few minutes; report duration).

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(levels): 25 solver-verified levels and seed finder"`

---

### Task 7: Cat art (SVG) and palette

**Files:**
- Create: `src/ui/art/cardArt.ts`, `src/ui/art/catArt.ts`, `src/ui/styles.css`, `gallery.html`, `src/ui/art/gallery.ts`

**Interfaces:**
- Consumes: `Card`, `RANK_LABELS` (Task 1).
- Produces (all return SVG markup strings; each root `<svg>` has a `viewBox` and no fixed width/height so CSS sizes it):
  - `cardFaceSvg(card: Card): string` — viewBox `0 0 100 140`
  - `cardBackSvg(): string` — viewBox `0 0 100 140`
  - `wildCardSvg(): string` — viewBox `0 0 100 140`
  - `catPortraitSvg(kind: 'kitten' | 'bow' | 'crown'): string`
  - `catHeadSvg(): string` (map marker, win dialog, icon source)
  - `pawSvg(): string`, `yarnBallSvg(): string`, `heartSvg(): string`, `fishSvg(): string`
  - `styles.css` defines CSS custom properties used by later tasks: `--night: #141d3b`, `--night-2: #22306b`, `--gold: #f4c95d`, `--pink: #f7a8c4`, `--cream: #fff8ef`, `--suit-red: #d6336c`, `--suit-dark: #1b2a4a`, plus base body styles (full-height, `background: radial/linear gradient night → night-2`, twinkling star layer via CSS, `font-family: system-ui, "Segoe UI", Roboto, sans-serif`, `touch-action: manipulation`, `user-select: none`, `overscroll-behavior: none`).

Art requirements (spec § Art & motion):
- Face: cream rounded rect (rx 8), thin gold border. Rank + suit glyph in top-left and rotated 180° bottom-right, large (rank font-size ≥ 22 in viewBox units). Centre: 2–10 one large suit glyph; Ace a large suit glyph with a small paw print; J/Q/K the matching cat portrait (J kitten, Q bow, K crown) in the suit color. Suits ♥♦ `--suit-red`, ♠♣ `--suit-dark` (use literal hex in SVG, since SVG strings are inlined).
- Back: night-blue gradient, small stars, a crescent moon, and a black cat silhouette sitting on a rooftop line; gold border.
- Wild: gold/pink gradient, big paw print, the word "WILD".
- Cats: simple, round, friendly shapes (head circle, triangle ears, whisker lines, dot eyes); no copied characters.
- `gallery.html` (dev only, not in the build input) loads `src/ui/art/gallery.ts`, which renders all 52 faces, back, wild, and every icon in a grid at 70 px card width on the night background.

- [ ] **Step 1: Implement the art modules and `styles.css`** per the requirements above.
- [ ] **Step 2: Visual check.** Run `npx vite --port 5173`, open `http://localhost:5173/gallery.html` at 360×800, take a screenshot, and save it to `.superpowers/sdd/artifacts/task7-gallery.png` (gitignored folder; create it). Check: ranks readable at 70 px wide, J/Q/K show distinct cats, suit colors correct, back shows moon + cat.
- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` clean; `npm test` still PASS.
- [ ] **Step 4: Commit** — add `.superpowers/` to `.gitignore`; `git add -A && git commit -m "feat(ui): cat-themed svg card art and palette"`

---

### Task 8: Level screen (board, HUD, dialogs, effects)

**Files:**
- Create: `src/config.ts`, `src/ui/board.ts`, `src/ui/hud.ts`, `src/ui/dialogs.ts`, `src/ui/fx.ts`, `src/ui/levelScreen.ts`
- Modify: `src/main.ts` (temporary: open the level from `?level=N`, default 1)

**Interfaces:**
- Consumes: `deal`, `reduce`, `top`, `playable`, `GameState`, `Action` (Task 3); `starsFor`, `ECON` (Task 3); `LevelDef`; `LEVELS` (Task 6); `SaveV1`, `withCoins`, `recordWin` (Task 5); art functions (Task 7); CSS variables (Task 7).
- Produces:
  - `src/config.ts`: `export const APP_NAME = 'Solitaire Dreams'; export const CREDIT = 'Made with ♥ for Anna';`
  - `mountLevel(root: HTMLElement, level: LevelDef, deps: LevelDeps): () => void` in `levelScreen.ts`, returning an unmount function, where
    ```ts
    export interface LevelDeps {
      getSave(): SaveV1;
      setSave(save: SaveV1): void; // caller persists to localStorage
      exit(to: 'map' | 'next' | 'final'): void;
    }
    ```

Behavior:
- **Session:** `state = deal(level, getSave().coins)`. Every user action: `next = reduce(state, action)`; if `next === state`, play a 300 ms wiggle on the tapped element and do nothing else; otherwise animate the diff and set `state = next`.
- **Persist coins** (`setSave(withCoins(getSave(), state.coins))`) on: exit to map, retry, win (before `recordWin`), and `document.visibilitychange` → `hidden`. Remove the listener on unmount.
- **Board geometry:** available area = viewport minus HUD (top ~56 px) and bottom bar (~150 px). `ROW_STEP = 0.5`, card aspect 1.4. `w = min(availW / layout.width, availH / ((1 + (layout.rows - 1) * ROW_STEP) * 1.4))`, `h = 1.4 w`. Slot left = `offsetX + x * w`, top = `row * ROW_STEP * h`; centered horizontally. Recompute on `resize`.
- **Cards:** one `<button class="card">` per slot, absolutely positioned, `z-index = row + 1`, `aria-label` like "5 of hearts" when face-up. Exposed cards (`isExposed`) show the face; covered cards show the back. When a card becomes exposed, flip it (CSS 3D `rotateY`, 250 ms). Removed slots are hidden.
- **Play animation:** the played card flies from its slot to the discard pile (transform only, 250 ms, ease-out), then the discard shows it. Paw-print sparkle burst at the destination (`fx.ts`).
- **Stock:** button showing the back with the remaining count; tap → `draw`; the drawn card flips onto the discard. Discard shows the top card, or `wildCardSvg()` for a wild.
- **HUD (top):** back button (→ persist, `exit('map')`), "Level N", coin counter (animates changes), streak meter "×N" that glows at ≥ 5.
- **Bottom bar:** stock, discard, and three booster buttons: "Undo · 5", "Wild · 25", "+5 · 30". Each is `disabled` when `reduce(state, action) === state`. All buttons ≥ 44×44 px.
- **Win** (`status === 'won'`): after the last animation, persist coins, `stars = starsFor(level, state.stock.length)`, `{ save, bonus } = recordWin(getSave(), level.id, stars, LEVELS.length)`, `setSave(save)`. Show the win dialog: cat pops up, 1–3 stars animate in, lines "Level clear +20", "Cards left N × 2 = +2N", and "3-star bonus +25" when `bonus > 0`, plus the wallet total. Buttons: **Next** (`exit('next')`; on the last level the button reads "The end ♥" and calls `exit('final')`), **Replay** (redeal the same level), **Map**. Heart/fish/paw confetti.
- **Stuck** (`status === 'stuck'`): out-of-moves dialog: title "Out of moves", buttons "+5 cards · 30" and "Wild · 25" (disabled when unaffordable, dispatching `addFive`/`wild` and closing the dialog), **Retry** (persist, redeal), **Map**. Neutral copy only: no countdowns, no "only now", no pressure.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, skip sparkles/confetti and use 0 ms transitions.
- Card and effect animations use `transform`/`opacity` only.

- [ ] **Step 1: Implement `config.ts`, `fx.ts`, `board.ts`, `hud.ts`, `dialogs.ts`, `levelScreen.ts`** per the behavior list.
- [ ] **Step 2: Temporary entry.** `src/main.ts`: import `./ui/styles.css`; read `?level=N` (default 1); keep an in-memory save from `loadSave()`, persisting via `writeSave` in `setSave`; call `mountLevel`; on `exit`, reload the page with the next level id (placeholder routing, replaced in Task 9).
- [ ] **Step 3: Smoke test in a real browser** at 360×800 with `npx vite`:
  1. Level 1 loads: bottom row face-up, others face-down; coins show 100.
  2. Tap a playable card → it flies to the discard, coins 101, streak ×1.
  3. Tap a non-playable card → wiggle, no state change.
  4. Tap stock → card flips to the discard, streak resets.
  5. Undo → the previous board returns, coins −5 plus the undone move's earnings.
  6. Wild → the discard shows the wild card, and any exposed card is then playable.
  7. Reload mid-level after earning coins → the map/level shows the kept coins (visibilitychange persist).
  8. Play to a win or stuck state (use `?level=1` and draws until the stock is empty): the correct dialog appears with working buttons.
  Save screenshots of steps 1, 6, and 8 to `.superpowers/sdd/artifacts/task8-*.png`.
- [ ] **Step 4:** `npx tsc --noEmit` clean; `npm test` PASS.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(ui): level screen with boosters, dialogs, and effects"`

---

### Task 9: Level map, final screen, router

**Files:**
- Create: `src/ui/map.ts`, `src/ui/finalScreen.ts`
- Modify: `src/main.ts` (replace the temporary entry)

**Interfaces:**
- Consumes: `LEVELS`; `SaveV1`, `loadSave`, `writeSave`; `mountLevel`, `LevelDeps` (Task 8); `CREDIT`, `APP_NAME`; art (`catHeadSvg`, `pawSvg`, `yarnBallSvg`).
- Produces: `mountMap(root, deps: { getSave(): SaveV1; play(levelId: number): void }): () => void`; `mountFinal(root, deps: { back(): void }): () => void`.

Behavior:
- **Map:** header with `APP_NAME` and the coin total. A vertically scrolling winding path, level 1 at the **bottom**. Node `i` center: `x = 50% + sin(i × 0.9) × 30%` of width, vertical spacing 110 px. Paw prints (small, rotated along the path direction, 3 per gap) between consecutive nodes. Nodes are 64 px yarn balls showing the level number and the best stars (1–3 small gold stars; empty outlines if not won). Levels with `id > save.unlocked` are dimmed and not tappable. The current node (`save.unlocked`, or 25 once all are won) pulses and has the cat head sitting on it. On open, scroll so the current node is centered. If `save.stars[25]` exists, show a small "♥" button at the top of the path that opens the final screen.
- **Final screen:** cat head, "You finished all 25 levels!", `CREDIT`, gentle confetti (respect reduced motion), and a "Back to map" button.
- **Router (`main.ts`):** import `styles.css`; `save = loadSave()`; `getSave = () => save`; `setSave = (s) => { save = s; writeSave(s); }`. Screens: map → `play(id)` mounts the level; level `exit('map')` → map, `exit('next')` → level `id + 1`, `exit('final')` → final; final `back()` → map. Call `navigator.storage?.persist?.()` once on startup and ignore its result. Remove the `?level=` handling.

- [ ] **Step 1: Implement `map.ts`, `finalScreen.ts`, `main.ts`.**
- [ ] **Step 2: Smoke test** at 360×800 with `npx vite`: a fresh profile shows level 1 current, others locked, coins 100. Win level 1 → Next opens level 2; back on the map, level 1 shows its stars and level 2 is current. Seed `localStorage['tripeaks.save']` with `{"version":1,"coins":500,"unlocked":25,"stars":{"25":1},"threeStarBonusPaid":[]}`, reload → the ♥ button appears and opens the final screen with the credit line. Save screenshots `task9-map.png` and `task9-final.png` to `.superpowers/sdd/artifacts/`.
- [ ] **Step 3:** `npx tsc --noEmit` clean; `npm test` PASS.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(ui): level map, final screen, router"`

---

### Task 10: PWA, icons, GitHub Pages deploy

**Files:**
- Create: `public/icon.svg`, generated PNGs in `public/`, `.github/workflows/deploy.yml`
- Modify: `vite.config.ts`, `index.html`, `package.json` (devDependencies)

**Interfaces:**
- Consumes: the built app from Tasks 1–9; `catHeadSvg` design for the icon.
- Produces: an installable, offline-capable build at `https://jaydorado.github.io/AnnasGame/`.

- [ ] **Step 1: Install**

```bash
npm install -D vite-plugin-pwa @vite-pwa/assets-generator
```

- [ ] **Step 2: Icon source.** Write `public/icon.svg`: 512×512 viewBox, `--night` rounded-square background, the cat head from `catHeadSvg()` centered at ~60% size in cream with gold accents (static SVG, colors inlined). Keep the important content inside the central 80% (maskable safe zone).

- [ ] **Step 3: Generate icons**

```bash
npx pwa-assets-generator --preset minimal-2023 public/icon.svg
```

Expected files in `public/`: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`.

- [ ] **Step 4: Configure the PWA**

`vite.config.ts`:

```ts
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Solitaire Dreams',
        short_name: 'Solitaire',
        description: 'Cat-themed TriPeaks solitaire. No waiting, no shop.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#141d3b',
        theme_color: '#141d3b',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico}'] },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
});
```

`index.html` `<head>` additions:

```html
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

(Vite rewrites these absolute paths to include `base` at build time.)

- [ ] **Step 5: Deploy workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          VITE_BASE: /AnnasGame/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 6: Local production smoke**

```bash
VITE_BASE=/AnnasGame/ npm run build
npx vite preview --base /AnnasGame/ --port 4173
```

(On Windows PowerShell: `$env:VITE_BASE='/AnnasGame/'; npm run build`.)

In headless Chromium at 360×800, open `http://localhost:4173/AnnasGame/` and check: the map renders; `navigator.serviceWorker.controller` is non-null after one reload; the manifest link resolves with name "Solitaire Dreams" and 4 icons; with the network set offline, a reload still renders the map and a level can be opened. Save `task10-offline.png` to `.superpowers/sdd/artifacts/`.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: pwa manifest, icons, pages deploy workflow"`

---

## Finish (controller, after all tasks and reviews)

1. Full suite: `npm test` (including levels) and `npm run build` on `v1`.
2. Adversarial pass on the merge diff `main..v1` (HANDOVER §12 practice, `adversary` seat) → `docs/reviews/2026-09-26-tripeaks-v1-adversary.md`; Jay approves.
3. Merge `v1` → `main`, `git push origin main`. Jay has already set Pages Source = GitHub Actions (repo Settings → Pages).
4. Confirm the Actions run is green and `https://jaydorado.github.io/AnnasGame/` loads; open it in Android Chrome → "Install app".

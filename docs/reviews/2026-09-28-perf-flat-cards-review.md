# Review: `main..v1` (perf flat cards, card spin flight, bigger piles)

Date: 2026-09-28. Reviewer: Claude Opus (read-only static review). Scope: `git diff main..v1`, commits
175b850 (bigger draw pile/discard), 6e4e978 (card spin flight), 667454e (perf: flat cards at rest, 3D only
while flipping, pause stars in levels). 667454e held to the invariants in `local://perf-brief.md`.
Worktree is clean on `v1` (only untracked review docs).

## Verdict: **ship**

No blocking or player-visible bugs found. One optional P3 hardening note (overlapping flips inside the
90 ms delay), which is an improvement over `main`'s behaviour, not a regression.

## What was checked, and why it holds

### Flat-at-rest / 3D-while-flipping (667454e)

- **Face-down card never shows its face at rest.** `src/ui/styles.css:365-368`:
  `.card:not(.up):not(.flipping) .card-face.front { visibility: hidden }`. No card art sets
  `visibility: visible` on a descendant (grep of `src/` for `visibility` finds only this rule and
  `document.visibilityState`), so the hidden face cannot leak through a child. Faces are still only
  rendered on first exposure (`src/ui/board.ts:68-71`, unchanged).
- **Face-up card never shows its back at rest.** Same rule, second selector (`.card.up:not(.flipping) .card-face.back`).
- **Flip start matches the resting look (no one-frame flash).** `flipCard` (`src/ui/fx.ts:218-231`) adds
  `.flipping` synchronously in the same task that creates the animation, so the first rendered frame
  has both. Flip up: `.card.flipping.up > .card-inner` base is `rotateY(0)`, but the animation's
  `fill: 'backwards'` holds `rotateY(180deg)` through the 90 ms delay, so with preserve-3d and
  backface-visibility the back shows (back face `rotateY(180)` inside a `rotateY(180)` inner = identity,
  unmirrored), which matches the flat back. Flip down: no delay, first keyframe `rotateY(0)` shows the front,
  matching the flat front.
- **Flip end matches the flat look.** After the animation ends, the `.flipping` base style equals the
  animation's last keyframe (up: inner `rotateY(0)`, front shown; down: inner `rotateY(180)`, back at net
  identity), and the flat style picks the same face via `.up`. So even if `finished` settles a frame late,
  nothing visibly changes when the class is removed.
- **Class lifecycle.** `anim.finished.then(done, done)` covers both finish and cancel (unmount cancels
  every animation under the screen, `src/ui/levelScreen.ts:352`, so `.flipping` is cleared on a detached
  board too). The WeakMap guard stops an older flip ending a newer flip's 3D mode in the common orders:
  down then up (the up flip has the 90 ms delay, so it always ends last); up then down more than 90 ms later
  (the down flip ends last). See F1 for the one remaining order.
- **Reduced motion.** `flipCard` returns after `fadeIn(card)` before touching the class, so reduced-motion
  cards stay flat, with no 3D (`src/ui/fx.ts:211-214`).
- **Nudge vs flip.** Nudge animates `transform` on `.card` (CSS `@keyframes nudge`). The flip animates
  `.card-inner`, and `.card.flipping` only adds `perspective` on `.card`, which does not touch `.card`'s own
  transform. The nudge `animationend` handler filters `animationName.startsWith('nudge')`, and WAAPI flips
  fire no CSS animation events. No conflict.
- **Stacking.** Every board card has an inline `z-index` (`board.ts:46`), so it still forms a stacking
  context without the old always-on `perspective`. The playable glow `::before { z-index: -1 }` stays
  behind its own card.
- **Flyers.** `.flyer` keeps perspective, preserve-3d, backface-visibility and the back's `rotateY(180)`
  (`styles.css:370-395`); the generic `.card-inner` / `.card-face` box rules still apply. Drawn card:
  no `.up`, so inner base `rotateY(180)`, and the inner animation goes 180 to 0 by `landed`, so it turns
  face-up mid-flight. Played card: `.up` and no back element, so the front shows. Reduced-motion drawn card:
  no flyer (unchanged).
- **No other consumers of the old 3D rules.** `.card-inner` / `.card-face` are used only by board cards,
  flyers and the dev gallery (flat `.card` spans with `.up`, which render correctly flat).

### Stars paused in levels (667454e)

- `in-level` is added at the end of `mountLevel` (`levelScreen.ts:338`) and removed in its unmount
  (`levelScreen.ts:346`). Every screen change goes through `show()` in `src/main.ts:33-36` (unmount, then
  mount), so: level to level (Next or popstate) removes then re-adds the class synchronously; level to map or
  final (in-app, via history.back, then popstate) removes it; map and final never add it. The unmount is
  guarded by `mounted`, so the class cannot be removed twice or leak.
- `.level` has an opaque wood background covering the padding box, and the portrait `.rotate` overlay is
  opaque too, so stopped stars are never visible. The reduced-motion rule also sets `animation: none`, so
  there is no conflict.

### Bigger piles (175b850)

- `levelFrame` bisection (`src/ui/frame.ts:75-94`): the predicate is monotone (a taller strip gives an
  equal or smaller board card), `hi = ceil(h)` always satisfies it (area 0, card 0), and if `h < room` the
  loop is skipped and the piles get height 0, not NaN. `.bar` padding (`--badge-rise` top, `--pile-margin-b`
  bottom) leaves exactly `pileH` for the piles, matching `stripH = rise + margin + pileH`.
- `board.fit(f)` now takes the computed frame instead of `area.clientWidth/Height`. The grid tracks
  (`minmax(0,1fr) var(--booster-w)` / `minmax(0,1fr) var(--strip-h)`) give the same area as
  `levelFrame` (screen size minus env padding, minus BOOSTER_W / stripH). `resize()` runs after
  `root.append(screen)`, so its `clientWidth`/`getComputedStyle` reads are valid. Window `resize` re-applies
  both.
- Hint `right:` calc and badge offsets use the same custom properties that `applyFrame` sets. Props do not
  overlap the piles at 640x360 or 844x390 (checked by arithmetic).

### Card spin flight (6e4e978)

- `arcPath`: offsets are strictly increasing for the shipped constants (pop 80 ms < land 370 / 270 ms).
  The spin ends at `rotateZ(±360)`, which is upright. The squash keeps the bottom edge fixed
  (`centre + sy*h/2 = dy + k*h/2` for every squash keyframe). The keyframe transform lists all have the
  same function sequence, so they interpolate per function. `transform-origin` moved to the centre
  (`styles.css:757`) to match the centre-to-centre `dx/dy` (`fx.ts:171-172`).
- The drawn-card rotateY finishes at `landed = (ms - SQUASH_MS) / ms` with `ms = DRAW_FLY_MS`, so it is
  face-up before the squash.

## Findings

### F1 (P3, optional): a stale flip keeps animating after a newer flip ends and removes `.flipping`

- **Where:** `src/ui/fx.ts:218-231` (`flipCard`).
- **Trigger:** a card flips up (flip A, 90 ms delay), then flips down (flip B, e.g. an Undo) less than
  90 ms later. B has no delay and ends first (`B0 + 380 < A0 + 470`). `flips.get(card) === B`, so B's
  `done` removes `.flipping`, but A is still in its active phase for up to ~90 ms and keeps writing
  `rotateY(θ→0) scale(…)` to `.card-inner` of a now-flat, face-down card.
- **Impact:** the flat back is briefly squashed horizontally (rotateY with no perspective), then snaps
  back. No face leak: the front is `visibility: hidden`. This is better than `main`, where the same tail
  kept preserve-3d on and showed the *front* of a face-down card for the same window. It needs an Undo
  tapped within 90 ms of a play, so it is cosmetic and rare. Not a merge blocker.
- **Fix:** cancel the previous flip before starting a new one. B already overrides A while both run,
  so cancelling A only removes the tail. A's `done` then runs with `flips.get(card) === B` and does
  nothing.

```ts
  const inner = card.firstElementChild as HTMLElement;
  const from = up ? 180 : 0;
  const to = up ? 0 : 180;
  flips.get(card)?.cancel();
  card.classList.add('flipping');
```

## Not verified

- Static review only: I did not run a browser, `npm test` or `npm run build`, and did not re-measure layers.
  The acceptance checks 1-4 in the brief (tests/build, visual pass at 844x390, layer count and Commit time)
  still need to come from the builder's report and the partner's re-measure.
- The claim that end-of-flip class removal is invisible rests on the base style of `.flipping` equalling
  the last keyframe. It does not depend on when the `finished` microtask runs relative to paint.

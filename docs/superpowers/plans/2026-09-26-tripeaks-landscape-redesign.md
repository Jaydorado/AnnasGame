# TriPeaks v1 — Landscape Redesign (plan addendum)

Approved by Jay on 2026-09-26 (evening), after he played `v1` at `1c1d1ea`. His feedback:
- It should look like Disney Solitaire: card layout and a polished, cartoonish mobile-game style.
- The board was tiny and everything else was huge.
- He didn't know what to do at first.

The reference screenshot is `.superpowers/sdd/artifacts/reference-disney-level.webp`, for style and layout only.

This addendum supersedes the spec's portrait layout and card-size sections (spec §UI). It does not change rules, levels, economy, save format, or no-pay/no-wait.

## Hard constraints (all tasks)
- **No Disney IP.** No Mickey silhouettes, no Disney characters, fonts, logos, or copied assets. "Like Disney Solitaire" means the layout, proportions, finish, and feel. All art is our own code-drawn SVG/CSS, and the cats stay our mascot.
- `src/core/`, `src/levels/`, and `src/progress/` behavior is unchanged. All existing tests stay green. `npx tsc --noEmit` is clean.
- Keep the modal-dialog focus behavior (task 8 fix, `b15e18c`) and the I1 save merge (`1c1d1ea`).
- Target viewport is **800×360 landscape** (Android Chrome). It must also work at 640×360 and 915×412. Respect safe-area insets.
- Performance: animations use CSS transforms/opacity only. There are no per-frame layout reads in loops, and no image downloads beyond the precached bundle.
- Each task ends with headless-Chromium screenshots at 800×360 and 640×360, saved to `.superpowers/sdd/artifacts/redesign-tN-*.png`. The controller looks at them against the reference.

## Art direction (applies to T12–T15)
- **Table:** a warm cartoon wooden tabletop: orange-amber radial gradient, soft wood-grain strokes, and a vignette at the edges. A couple of soft, blurred cartoon props sit in the corners, all our own: a cushion, a yarn basket with a sleeping cat. They are decorative and kept out of the play area.
- **Cards:** white faces, radius about 10% of width, a subtle 1 px warm-grey border, and a soft drop shadow.
  - A **large bold rank** in the centre, with a small rank and suit in the top-left corner.
  - Red is `#e8335a`-ish and black is deep navy. Use a chunky rounded font stack, system `ui-rounded`, falling back to a bundled-free choice.
  - Backs are saturated blue with a lighter inner border and a subtle glossy highlight, plus a small paw emblem in the centre.
- **Polish:** chunky rounded UI with glossy pill buttons (gradient, inner highlight, dark bottom edge), outlined bold numbers on the coin pill and price tags, and soft shadows everywhere. It should feel juicy and toy-like, not flat.
- The **cats** appear on the wild card, the corner prop, the map markers, and the win screen, as expressive cartoon cats.

## Tasks

### T11 — Landscape shell and board sizing
- Manifest: `orientation: 'landscape'` (`vite.config.ts`).
- Portrait overlay: in a portrait viewport (`orientation: portrait`), show a full-screen "Turn your phone 🔄" card with a cartoon cat, and pause input underneath.
- Level screen grid for landscape:
  - The board area fills the space above a bottom strip of about 1 card height plus padding, which holds the stock and waste at bottom centre.
  - The HUD overlays the top corners, not a full-width bar that takes height.
  - Booster buttons form a vertical column on the right edge.
- Extract the board fit math into a pure function, `fitBoard(areaW, areaH, layout) → {cardW, cardH, offsetX, offsetY}`, used by `board.ts`. Tighten `PAD` and the side overlap only if needed.
- **Failing test first** (`src/ui/boardFit.test.ts`): for every layout in `layouts.ts`, with the board-area size the new CSS gives at an 800×360 viewport (export those numbers as constants shared with the CSS custom properties), `cardW ≥ 60`, and nothing overflows the area. At 640×360, `cardW ≥ 52`.
- Acceptance:
  - screenshots of all 5 layouts at 800×360;
  - the portrait overlay at 360×800;
  - card widths measured in the browser, logged in the report.

### T12 — Card art and table
- Rewrite `src/ui/art/cardArt.ts` faces and backs, and the table background in `styles.css`/an SVG, per the art direction.
- The stock shows a **stacked edge**: offset layered backs, capped at about 10 layers, with the count badge kept.
- The waste sits beside the stock, with the top card fully shown.
- Update the dev card gallery (`gallery.ts`) so every rank and suit, the back, the wild card, and the face-down state are visible at the new size.
- Acceptance: gallery screenshot, and a level screenshot at 800×360 next to the reference.

### T13 — Level screen layout, HUD, boosters, and onboarding
- **Top-left:** a round back button and a glossy coin pill with the coin icon and an outlined number.
- **Top-right:** the level number and the streak counter as pills.
- **Right edge:** round glossy booster buttons (Undo, Wild, +5) with a price tag under each. When disabled they are greyed but still readable.
- **Playable glow:** exposed cards that are playable on the waste get a soft pulsing glow. This is off while a dialog is open.
- **First-timer hint on level 1:** a speech bubble from the corner cat saying "Tap a card one higher or lower than the ⟨waste rank⟩!", using the real waste rank. It goes away after the first play and does not come back on later visits. Store the flag in `localStorage` under a separate key; no save-format change.
- **Idle nudge, any level:** after 5 s without input, one playable card does a gentle wiggle. If none is playable, the stock wiggles. Any input resets the timer, and there is no nudge while a dialog is open.
- Dialogs (win, out of moves, pause) get a landscape layout that fits in 360 px height, with the same chunky, glossy style.
- Acceptance:
  - screenshots of the start state (hint visible), mid-game, the out-of-moves dialog, and the win dialog;
  - a keyboard-focus check that the dialogs still trap focus.

### T14 — Juice: animations and feedback
- **Card to waste:** the card flies in an arc to the waste with a slight rotation and lands with a squash (about 300 ms).
- **Stock draw:** the card flips over as it moves to the waste.
- **Uncovering:** newly exposed cards flip face-up with a 3D flip.
- **Coins:** "+1" (with the coin icon) floats up from each cleared card. On streak multiples of 5, a bigger "+N streak!" popup appears. The coin pill counts up and bounces.
- **Streak:** a combo counter pops and scales with the streak.
- **Wrong tap:** a short shake on the tapped card, with no penalty.
- **Win:** confetti and paw-print burst, stars popping in one by one on the win dialog, and a cheering cat.
- **Reduced motion:** honour `prefers-reduced-motion` by cutting movement to fades.
- Acceptance: short screenshot sequences or a frame grid of the fly, flip, and win; no dropped input during animations (taps queue or are ignored cleanly, with no double-plays); all tests green.

### T15 — Landscape map and final screen
- The yarn-ball trail scrolls horizontally, left to right, on a cartoon night-sky or rooftop backdrop, with the same polish as the level screen: glossy markers, stars, and the cat on the current level.
- It auto-scrolls to the current level on open. The coin pill sits top-left and the title top-right.
- The final screen and any other screens fit 800×360.
- Acceptance: map screenshots at level 1 and with 12 levels unlocked, and a final screen screenshot.

## Review and finish
Review runs under Jay's override, ruling R19: the reviewer is `cursor/grok-4.7-high`, the adversary is `cursor/grok-4.7-xhigh`, and neither has a fallback.
- After each task: a `reviewer` pass, with fixes by a fresh `builder-opus` (at most 3 rounds).
- After T15: one `adversary` pass on `main..v1`, which also covers I1 (`1c1d1ea`, R17/R18). Then the advocate rebuttal, commit, and push `v1`.
- Jay plays the redesign before any merge to `main`.

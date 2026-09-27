# Adversary review: TriPeaks v1 merge after the landscape redesign

- Reviewer seat: adversary
- Model: Grok 4.7
- Date: 2026-09-26
- Range: `main..v1` = `88e7400..75c8d52` (v1 HEAD `75c8d52`)
- Author under review: Anthropic (builder-opus) for every commit on the range. This seat is not that vendor.
- Evidence: read-only. Unit suite `npm test` 119/119 and `npx tsc --noEmit` clean on `75c8d52`. Browser runs used headless Chrome (Playwright) against `npx vite` at `http://127.0.0.1:5195/` in the main checkout. Offline used the existing gate build in `C:/Users/julia/annasgame-verify-i1` (`877ff33`, `vite preview` on `:5196`); the only later commit is the map coin-pill accessibility line. No tracked product file was edited.

## Verdict

**Merge**

The I1 fix still holds after the redesign. A stale tab does not write an old copy of the save, and the first 3-star bonus is paid once. The landscape level, dialogs, map, and final screen fit at 640×360, 800×360, and 915×412, focus stays inside a dialog, and the card-width floors hold on the real layout. Nothing found loses her progress, softlocks a level, or asks her to pay or wait.

## Findings

No Blocking or Important findings.

### M6 — Minor — The app never handles the system Back control

- `src/main.ts` (no `history.pushState` / `popstate` anywhere under `src/`). Entering a level does not add a history entry: on a page that arrived from `about:blank`, `history.length` stayed `2` and `history.state` stayed `null` both on the map and after opening level 1.
- Android consequence is `[INFERENCE]`: a standalone WebAPK has a single history entry, so the system Back button or a gesture-nav edge swipe closes or backgrounds the app instead of returning to the map. Coins are not lost. `pagehide` still merges the session (see I1). The in-progress board is abandoned, and the level starts over on the next launch. Retry is free.
- The spec's back control is the on-screen button, and that button does return to the map with coins kept (I1, HUD Back). This is annoyance, not data loss.
- Fix, if Jay wants it: `pushState` when a level mounts, and on `popstate` do what HUD Back does (persist, then show the map).

## I1 — holds

Claim: a stale second tab must not overwrite newer progress, and the first 3-star bonus is paid once across tabs. Both held, including the paths the redesign added (state updates before the flight, portrait overlay, map remount on `visibilitychange`).

The write path is a read-modify-write, not a cached whole save. `getSave` reads storage on every call (`src/main.ts:24-26`). `persist` applies only `sessionCoins - baselineCoins`, then moves the baseline (`src/ui/levelScreen.ts:117-121`, `src/progress/save.ts:66-74`). A win goes through `recordWin` on that merged object (`src/ui/levelScreen.ts:199-202`), which keeps the best stars, the highest unlock, and pays `threeStarBonus` only when the stored list does not already contain the level (`src/progress/save.ts:76-88`). The map re-reads on show and does not write (`src/ui/map.ts:139-142`).

Repro, one browser context, two pages, shared `localStorage`. Page A is dealt and left sitting. Page B then writes:

`{coins:777, unlocked:6, stars:{1..5:3}, threeStarBonusPaid:[1,2,3,4,5]}`

| Trigger on the stale page | Observed save afterwards |
|---|---|
| `pagehide` (`goto about:blank`) | unchanged: 777 / unlocked 6 / five 3★ / paid `[1..5]` |
| `page.close()` | same |
| HUD Back | same, and the map pill shows `777` |
| `visibilitychange` forced to `hidden`, twice | same both times (no double write) |
| `visibilitychange` while still `visible` | same (a show does not write) |
| Wild, then Back | storage still 777 after the Wild; after Back, **752**, unlocks and stars unchanged. HUD showed `75` |
| Wild, then hidden | **752**, unlocks and stars unchanged |
| +5, then `pagehide` | **747**, unlocks and stars unchanged |
| Level 6 dealt from `{coins:100, unlocked:6}`, then the newer save, then 21 draws to "Out of moves", then Map | stock badge `21` → `0`, dialog title "Out of moves", buttons `+5 cards · 30`, `Wild · 25`, `Retry`, `Map`. Save unchanged at 777 / unlocked 6 / five 3★ |
| Stale level-1 win (47-move line, 4 cards left, 2★ this attempt) | dialog wallet **848**, no 3-star line. Save: coins **848** (777+71), unlocked **6**, star 1 still **3**, paid still `[1..5]`. A following `pagehide` stays 848 |
| Map showing 100, other page writes 777, then `visibilitychange` | pill stays `100` until the event, then **777**. Digits are in `.hud-coin-value` with `aria-hidden` null. Storage stays the newer save. A following `pagehide` on the map does not write |
| Play one card while four flights are still on screen, then `pagehide` immediately | coins **778** (777+1). The move was saved before the animation finished |
| Win, Replay, then `pagehide` | at the win: coins 214, unlocked 2, stars `{1:3}`, paid `[1]`. After Replay and after `pagehide`: the same object. The bonus is not applied again |

Two tabs, both dealt level 1 from a fresh 100-coin save, both played the same 3-star line (13 left, session wallet 189):

- Tab A dialog includes `3-star bonus +25` and wallet **214**. Save: coins 214, unlocked 2, stars `{1:3}`, paid `[1]`.
- Tab B dialog has no bonus line and wallet **303** (214 + 89). Save: coins **303**, unlocked 2, stars `{1:3}`, paid `[1]`.
- `pagehide` on A afterwards stays 303.

A concurrent pair of merges that both start from the same snapshot each write a save containing the bonus once (last write coins 214, bonus 25). The bonus is inside the written object, not added again on top of the other tab's write, so the last writer does not double-pay it. A true interleaving between `getItem` and `setItem` can drop one tab's coin delta. That window is the two storage calls inside `persist`, with no await between them. It is not the old bug: the stale page does not keep a whole save and write it back minutes later.

Portrait does not reopen a write. Cold load at 360×800: overlay text "Turn your phone 🔄", `#app.inert === true`, a real click does not open a level, Tab leaves focus on `body`. Resizing 800×360 → 360×800 fires the `(orientation: portrait)` change and then sets `inert`. The overlay itself does not write. A Wild spent before the rotate is still merged on `pagehide` (777 → 752) with unlocks kept. (A sample taken 100 ms after the resize still saw `inert === false`; that was the change event not having run yet. It is not the steady state.)

Going back from `about:blank` reloaded the document (`pageshow` flag was not persisted) and the reloaded page did not restore an older save over a 900-coin write.

## Leads

### M1 — partly

Chained Undo of plays is real. Spec economy line: Undo "reverts the last Play or Draw" and is "disabled when the last action was a booster." The plan (`docs/superpowers/plans/2026-09-26-tripeaks-solitaire-pwa.md`) rewrote that as chainable, and `src/core/game.test.ts:145-150` pins it. In the UI, two plays and one Undo landed on 96 (100+1+1−1−5). Two further plays and two Undos landed on 86. The second Undo was enabled. After a Wild, the Undo button's `disabled` was true.

Undo after Wild or +5 does not hold as a hole: both actions set `undoTo: null` (`src/core/game.ts:129` and `:147`), and the test at `game.test.ts:159-161` rejects Undo after a Wild. Each chained Undo still costs 5 on top of reversing that move's earnings, so it is not a coin printer. Leave it. Changing it would take away a second Undo Jay's plan asked for. Cost of "fixing" it: one frustrated undo of a mis-tap.

### M2 — holds as behavior, not as a defect

`starsFor` reads `stock.length` (`src/core/economy.ts:19-22`), and +5 prepends five cards onto the stock (`src/core/game.ts:139`). On levels 1–3, the best win that is still under `star3`, with one +5 inserted before the last action, becomes a 3-star and the wallet is 5 coins higher than that 2-star finish:

| Level | 2★ left / wallet | After +5: stars, left, wallet |
|---|---|---|
| 1 | 4 / 171 | 3★, 9, **176** |
| 2 | 7 / 167 | 3★, 12, **172** |
| 3 | 7 / 167 | 3★, 12, **172** |

That matches the spec's letter ("cards left in stock"). It does not beat a booster-free 3-star. Level 1's best booster-free win leaves 13 and a session wallet of 189, plus the 25 bonus, for **214**, against 176 on the bought line. The bonus pays once per level. She can already earn the 3-star without +5 (`levels.test.ts` checks `star3` against the solver). No fix unless Jay wants stars to ignore cards added by +5.

### M4 — holds as a test gap, not as a player bug

`src/core/game.test.ts:113-116` calls `addFive` twice on the same state, so both calls see the same `fiveUses`. `fiveUses === 1` is asserted for a single use (`game.test.ts:109`) and would fail if the field were not incremented, but nothing asserts that the second batch differs. The implementation does use the count: `mulberry32(level.seed + fiveUses + 1)` (`src/core/game.ts:134`). On level 1 the first batch is `8-2,9-1,7-3,1-0,10-1` and the second is `1-3,12-3,1-0,11-0,10-3`. A seed of `level.seed + 1` for every use, while still incrementing `fiveUses`, would keep today's tests green and deal the same five cards every time. No current player impact.

### M5 — holds, no player impact

`.github/workflows/deploy.yml:13-15` sets `cancel-in-progress: true` on the `pages` group. A superseded run can be cancelled. GitHub Pages keeps the last successful deployment, so a cancelled run does not replace her installed game with a half-written one. Not worth a change for this repo.

### M6 — partly

See the Minor finding. No history handling is verified in the source and in `history.length`. The Android exit itself was not run on a phone.

### R8 — does not hold as a current defect

The 34 px portrait cards are gone. The redesign's floors hold on the laid-out board, not only in `fitBoard`'s unit test. Every face-up card at deal accepted a hit in its top band. Nothing sat under the back button, coin pill, level pill, streak pill, booster column, or stock strip.

| Viewport | Smallest card | Layout |
|---|---|---|
| 800×360 (floor 60) | **60.94** | diamond (threePeaks 68.00, pyramid 81.27, twinPeaks 88.50, wall 79.33) |
| 640×360 (floor 52) | **54.80** | threePeaks (pyramid 81.27, twinPeaks 63.19, diamond 60.94, wall 77.06) |
| 915×412 | 73.33 | diamond, all others larger |

Stock is 54.3×76. Boosters are 64×67. Back is 44×44. With an extra 32 px of side padding and 16 px at the bottom (a stand-in for safe-area insets, which headless Chrome does not apply), threePeaks drops to 58.8 px at 800×360 and 48.4 px at 640×360. Cards stay inside the board and clear of the HUD. That is below the published floor and still above a 44 px tap. The floors in the plan are defined on the full viewport, and those viewports pass.

## Hostile pass

Checked against the redesign, not only the leads.

**Input during flights.** State changes before the animation (`src/ui/levelScreen.ts:140-147`). A second `click()` on the same slot does not play it again (`onTap` bails when the slot is empty, `levelScreen.ts:105-106`); the slot was `hidden` after the pair of clicks. Eight synchronous stock clicks dropped the badge from 20 to 12, one card each. Undo during the flight reversed the play and charged 5. `.fx` and `.flyer` compute `pointer-events: none`, and `elementFromPoint` on the flyer did not hit the flyer. Taps are not swallowed by the flight and are not applied twice.

**Dialogs and focus, after the restyle.** A real level-1 3-star win (bonus line included) at 640×360: dialog height 278.4, bottom 317.2, inside a 360 px screen. Next / Replay / Map bottoms 241.2 / 297.2 / 297.2, each 46 px tall, each the hit target at its center. The same win at 800×360 matches those button bottoms; at 915×412 the dialog bottom is 328.7 inside 412. Out-of-moves at all three sizes: four buttons inside the screen (Map/Retry bottom 275 at 640 and 800, 301 at 915). Tab and Shift+Tab cycled only Next, Replay, and Map. `.board` and `.fx` were `inert`. A script `click()` on Wild and on a playable card left the wallet unchanged and the dialog up. With 0 coins, +5 and Wild render disabled; Retry and Map stay enabled, and Retry redeals at 0 coins. No pay, no wait, no dead end.

**Portrait.** Covered under I1. The overlay is CSS, so it shows whenever the viewport is portrait even if the `matchMedia` listener were late. It does not persist on its own.

**Hint flag.** Level 1, empty `tripeaks.hintSeen`: bubble "Tap a card one higher or lower than the Jack!", `pointer-events: none`, no overlap with the stock at 800 or 640. The first play removes it and sets the flag to `"1"`. The save key is untouched by that write. Re-entering level 1 does not show it. `src/ui/hint.ts:9-30`.

**Idle nudge.** One `setTimeout` is armed on the level (`NUDGE_MS` 5000, `src/ui/levelScreen.ts:40-41, 283-296`). After HUD Back the pending count returned to 0 and stayed 0 for 5.5 s, with no `.nudge` node. It only adds a CSS class; it does not change `GameState`. Unmount clears it (`levelScreen.ts:335-343`).

**Reduced motion.** `prefers-reduced-motion: reduce`: the flight is a 220 ms two-keyframe fade (`src/ui/fx.ts:130-134`), and the playable-glow animation name is `none`. The play still counts.

**Performance.** Card flights, flips, nudges, and pops are transform/opacity. `getBoundingClientRect` runs once per tap (`levelScreen.ts:144-160`), not per frame. The coin pill's count-up writes `textContent` from `requestAnimationFrame` for 400 ms (`src/ui/hud.ts:54-59`). That is not a layout read. Confetti samples `clientWidth` once (`src/ui/fx.ts:260-261`).

**Art.** No Disney names or marks in `src/`, `public/`, or `index.html`. Faces, backs, and the mascot are the cat SVGs. App name is Solitaire Dreams.

**Economy, one tab.** Undo cannot run at a profit (the chain above). Wild at 0 coins is disabled. A stuck board with 0 coins still has Retry and Map. +5 counting toward stars is M2.

**PWA.** `vite.config.ts` manifest: name Solitaire Dreams, `display: standalone`, `orientation: landscape`, `start_url` and `scope` `/AnnasGame/`. Built `dist/index.html` (gate build) references only `/AnnasGame/…`. `sw.js` calls `skipWaiting` and `clientsClaim` and precaches the app; `registerSW.js` does not reload an open page, so an update does not wipe a mid-level session. Offline reload of `http://127.0.0.1:5196/AnnasGame/` with a controlling worker: `navigator.onLine === false`, title "Solitaire Dreams", 25 map nodes, no page error. `gallery.html` is not in that `dist`. The minified bundle contains `tripeaks.save` and `tripeaks.hintSeen` and does not contain `withCoins`.

**Map and final.** At 640×360 with every level won, the current node and the heart are on screen, the coin pill reads 2500, and the final screen's Back button sits at y 216.8–264.8. Back returns to the map. Same button fits at 800×360.

## Rulings contested

None. The ones that carry player risk were checked, and reversing them costs more than it saves.

- **R17** (baseline moves to the session wallet at the win, so later Back / hidden / `pagehide` add a 0 delta). Holds in the browser: `pagehide` after a stale win stayed 848, `pagehide` after the two-tab win stayed 303, and Replay then `pagehide` stayed 214 with the bonus still paid once. Reversing it brings back the overwrite of the 3-star bonus. Cost of reversing: she loses the bonus.
- **R18** (clamp coins at 0 on merge). A stale Wild subtracts 25 from 777 and leaves 752; it does not zero the wallet or drop unlocks. The clamp is what stops `parseSave` from rejecting a negative total and resetting her to a fresh save. Cost of reversing: one corrupt merge wipes the profile. The two-tab double spend the ruling accepts did not show up as lost unlocks.
- **R20** (row step may fall to 0.25 so the 60 px floor is reachable). Measured card widths are above. At step 0.25 an exposed diamond card can be visually overlapped down to about half its height (42.7 px of an 85.3 px card at 800×360) by a card two rows down that is not its cover. The corner rank is drawn in the top fifth of the face (`src/ui/art/cardArt.ts:61-66`), so it stays in that half. Every face-up card at the deal was hittable. Forcing step 0.5 again makes the 9-row diamond miss 60 px, which is the complaint this redesign was for.
- **R22** (the clipped win dialog was fixed inside T13 rather than in its own round). The 640×360 3-star dialog, bonus line included, keeps Next, Replay, and Map on screen and hittable. The cost of having waited for a separate round did not land.
- **R8** is superseded by the measurements above, not by a waiver. **R9** (`pagehide` alongside `visibilitychange`) is now a 0-delta merge when nothing changed; hiding twice left 777 in place. **R14** (no workaround for the apostrophe in this folder's `npm run build`) is still a local nuisance and does not affect CI or the preview build that actually served the offline check.

## Advocate rebuttal (controller, @loop Opus 5.5, 2026-09-26)

Seat check: this pass ran on `cursor/grok-4.7-xhigh`, `resolvedModelIsFallback: false`, with no Anthropic request in its transcript (ruling R19: Jay's review override for this game; every implementer on `v1` is Anthropic). It is the first valid adversary pass on `v1`; the two earlier `*INVALID*` reports stay untracked and were used as leads only.

- **Verdict `Merge`: accept.** No Blocking or Important findings, so no fix round was dispatched.
- **I1 holds: accept.** This matches the controller's own repro at `1c1d1ea` (ledger, "Fix I1") and extends it to the redesign's new paths (flights, portrait overlay, map remount). The same-tick `getItem`/`setItem` interleave the report names is noted, not a finding: two tabs would need to persist within one JS task of each other.
- **M6 (Minor, system Back leaves the app mid-level): accept as real, defer to Jay.** No progress is lost (`pagehide` merges coins; retry is free). The fix is small (`pushState` on level mount, `popstate` does what HUD Back does), but it adds routing behavior that nobody has approved, so it waits for Jay's call. Open item in the ledger summary.
- **M1 (chained Undo): accept "leave it".** The plan chose it, and each Undo still costs 5.
- **M2 (+5 cards count toward stars): accept "behavior, not defect".** The spec's letter; a booster-free 3★ still pays more. Jay's call if stars should ignore +5 cards.
- **M4 (+5 seed test gap): accept.** Test gap only; logged with the deferred minors.
- **M5 (`cancel-in-progress`): accept "no impact".**
- **R8 superseded, R17/R18/R20/R22 uncontested: accept.** The safe-area measurement (threePeaks 58.8 px at 800×360 with a stand-in 32 px side inset) is below the 60 px floor but above a 44 px tap target; logged for Jay, no change.

Deferred minors from the task reviews (T12 rank baseline, stack-constant duplication, idle night-sky animation behind the table; T13 hint inset; T14 popups over the win dialog, burst origin, duplicated win payout terms, no automated tap-rule test; T15 town-strip height) are listed in `.superpowers/sdd/tripeaks-v1/ledger.md`; none blocks the merge.

Merge to `main` still waits for Jay: he plays the redesign first (plan § Review and finish).

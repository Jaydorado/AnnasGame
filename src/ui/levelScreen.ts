/**
 * The playable level in the landscape frame: board, bottom strip (stock, discard), booster column on
 * the right, HUD over the top corners, and dialogs. Helpers for new players: playable cards glow, an
 * idle nudge wiggles one after NUDGE_MS without input, and level 1 shows a one-time hint bubble.
 * All rules live in core/game; this screen dispatches actions and animates the difference.
 */
import type { Top } from '../core/cards';
import { ECON, starsFor } from '../core/economy';
import { deal, playable, reduce, top, type Action, type GameState } from '../core/game';
import type { LevelDef } from '../core/level';
import { LEVELS } from '../levels/levels';
import { mergeSessionIntoSave, type SaveV1, type SessionWin } from '../progress/save';
import { cardBackSvg } from './art/cardArt';
import { catHeadSvg } from './art/catArt';
import { boosterIconSvg } from './art/hudArt';
import { basketCatSvg, cushionSvg } from './art/tableArt';
import { cardLabel, createBoard, topSvg } from './board';
import { showStuckDialog, showWinDialog, type WinInfo } from './dialogs';
import { coinPop, confetti, fadeIn, flyCard, playCoins, pop, reducedMotion, sparkleBurst, streakPop, wiggle } from './fx';
import { applyFrame } from './frame';
import { hintSeen, hintText, markHintSeen } from './hint';
import { createHud } from './hud';

export interface LevelDeps {
  getSave(): SaveV1; // reads the stored save fresh on every call
  setSave(save: SaveV1): void; // caller persists to localStorage
  exit(to: 'map' | 'next' | 'final'): void;
}

type Booster = 'undo' | 'wild' | 'addFive';

const BOOSTERS: readonly { readonly type: Booster; readonly name: string; readonly cost: number }[] = [
  { type: 'undo', name: 'Undo', cost: ECON.undoCost },
  { type: 'wild', name: 'Wild', cost: ECON.wildCost },
  { type: 'addFive', name: `+${ECON.addFiveCount}`, cost: ECON.addFiveCost },
];

/** Most backs drawn in the stock's stacked edge. */
const STACK_MAX = 10;
/** Idle time before a playable card (or the stock) wiggles; a UI timer, not a gameplay one. */
const NUDGE_MS = 5000;

export function mountLevel(root: HTMLElement, level: LevelDef, deps: LevelDeps): () => void {
  let state: GameState = deal(level, deps.getSave().coins);
  let baseline = state.coins; // session coins already merged into the stored save
  let win: WinInfo | null = null; // set once the win is recorded in the save
  let dialog: { readonly kind: 'win' | 'stuck'; readonly close: () => void } | null = null;
  let inFlight = 0; // cards still flying to the discard
  let flights = 0; // flights started, numbering each one
  let landedSeq = 0; // newest flight whose card the discard shows
  let shownTop: Top | null = null;
  let mounted = true;
  let idleTimer = 0; // idle-nudge timeout; 0 while none is armed

  const screen = document.createElement('div');
  screen.className = 'level';
  applyFrame(screen);
  const hud = createHud(level.id, state.coins, () => {
    persistCoins();
    deps.exit('map');
  });
  const area = document.createElement('main');
  area.className = 'board';
  const bar = document.createElement('footer');
  bar.className = 'bar';
  // The stock is a stacked edge of up to STACK_MAX backs; layer k sits k steps to the left of the top.
  const layers = Array.from({ length: STACK_MAX }, (_, i) => STACK_MAX - 1 - i)
    .map((k) => `<span class="pile-card" data-k="${k}" style="--k:${k}">${cardBackSvg()}</span>`)
    .join('');
  bar.innerHTML =
    `<span class="prop prop-basket">${basketCatSvg()}</span>` +
    `<span class="prop prop-cushion">${cushionSvg()}</span>` +
    `<div class="piles">` +
    `<button type="button" class="pile stock">${layers}<span class="pile-count"></span></button>` +
    `<div class="pile discard" role="img"></div>` +
    `</div>`;
  // First-timer hint: level 1 only, until the first card is played (flag outside the save format).
  let hintEl: HTMLElement | null = null;
  if (level.id === 1 && !hintSeen()) {
    hintEl = document.createElement('div');
    hintEl.className = 'hint';
    hintEl.innerHTML = `<span class="hint-cat" aria-hidden="true">${catHeadSvg()}</span><p class="hint-bubble" aria-live="polite"></p>`;
    bar.append(hintEl);
  }
  const boostersEl = document.createElement('div');
  boostersEl.className = 'boosters';
  boostersEl.innerHTML = BOOSTERS.map(
    (b) =>
      `<button type="button" class="booster" data-booster="${b.type}" aria-label="${b.name} · ${b.cost}">` +
      `<span class="booster-ball">${boosterIconSvg(b.type)}<span class="booster-name">${b.name}</span></span>` +
      `<span class="booster-cost"><span class="coin" aria-hidden="true"></span>${b.cost}</span></button>`,
  ).join('');
  const fx = document.createElement('div');
  fx.className = 'fx';
  screen.append(hud.el, area, bar, boostersEl, fx);
  root.append(screen);

  const stockEl = bar.querySelector<HTMLButtonElement>('.stock')!;
  const countEl = bar.querySelector<HTMLElement>('.pile-count')!;
  const layerEls = [...stockEl.querySelectorAll<HTMLElement>('.pile-card')];
  const discardEl = bar.querySelector<HTMLElement>('.discard')!;
  const boosterEls = [...boostersEl.querySelectorAll<HTMLButtonElement>('.booster')];

  // A card that is gone (already played, possibly still in flight) ignores taps: no second play, no shake.
  const onTap = (slot: number, el: HTMLButtonElement): void => {
    if (state.table[slot]) act({ type: 'play', slot }, el);
  };
  let board = createBoard(area, state.layout, state.table, onTap);
  stockEl.addEventListener('click', () => act({ type: 'draw' }, stockEl));
  for (const b of boosterEls) b.addEventListener('click', () => act({ type: b.dataset.booster as Booster }, b));

  /**
   * Merges this session's coin delta (and `won`, if given) into the stored save, then moves the
   * baseline to the session wallet so repeated persists (hidden, pagehide, Back) add nothing twice.
   * A won state's coins never change, so persists after a win add 0 and keep the 3-star bonus.
   */
  function persist(won?: SessionWin): { save: SaveV1; bonus: number } {
    const merged = mergeSessionIntoSave(deps.getSave(), baseline, state.coins, won);
    deps.setSave(merged.save);
    baseline = state.coins;
    return merged;
  }

  /** Coin-only persist; zero-argument so it can be an event listener. */
  function persistCoins(): void {
    persist();
  }

  /**
   * The state changes at once on every tap; animations only render the difference, so a tap during
   * a flight is judged against the new state (a fast legal double play works, an illegal one shakes).
   */
  function act(action: Action, tapped: HTMLElement): void {
    if (dialog) return; // modal: the inert background can still receive script clicks
    const next = reduce(state, action);
    if (next === state) {
      wiggle(tapped);
      return;
    }
    const prev = state;
    state = next;
    if (action.type === 'play') {
      // Both rects are read before any DOM write, so the flight costs one layout.
      const from = board.slot(action.slot).getBoundingClientRect();
      const to = discardEl.getBoundingClientRect();
      board.update(state.table);
      fly(from, to, top(state), true);
      const coins = playCoins(prev, state);
      const x = from.left + from.width / 2;
      const y = from.top + from.height / 2;
      if (coins.card > 0) coinPop(fx, x, y, coins.card);
      if (coins.streak > 0) streakPop(fx, x, y, coins.streak);
      if (hintEl) {
        markHintSeen();
        hintEl.remove();
        hintEl = null;
      }
    } else if (action.type === 'draw') {
      const from = stockEl.getBoundingClientRect();
      const to = discardEl.getBoundingClientRect();
      board.update(state.table);
      fly(from, to, top(state), false, cardBackSvg());
    } else {
      board.update(state.table);
      if (action.type === 'addFive') pop(stockEl);
    }
    if (state.status === 'won') recordVictory();
    refresh(true);
    settle();
    if (action.type === 'wild') pop(discardEl);
  }

  /**
   * A card copy flies to the discard. Each landing shows its card unless a newer one already landed;
   * the landing that ends the last flight settles the discard on the state's top.
   */
  function fly(from: DOMRect, to: DOMRect, card: Top, sparkle: boolean, back?: string): void {
    const seq = ++flights;
    inFlight++;
    void flyCard(fx, from, to, topSvg(card), back).then(() => {
      if (!mounted) return;
      inFlight--;
      if (sparkle) sparkleBurst(fx, to.left + to.width / 2, to.top + to.height / 2);
      if (inFlight > 0 && seq > landedSeq) showDiscard(card);
      landedSeq = Math.max(landedSeq, seq);
      settle();
    });
  }

  function showDiscard(t: Top): void {
    if (t === shownTop) return;
    shownTop = t;
    discardEl.innerHTML = topSvg(t);
    discardEl.setAttribute('aria-label', `Discard: ${cardLabel(t)}`);
    if (hintEl) hintEl.querySelector('.hint-bubble')!.textContent = hintText(t);
    if (reducedMotion()) fadeIn(discardEl);
  }

  function recordVictory(): void {
    const stars = starsFor(level, state.stock.length);
    const { save, bonus } = persist({ levelId: level.id, stars, levelCount: LEVELS.length });
    win = { stars, cardsLeft: state.stock.length, bonus, wallet: save.coins, isLast: level.id === LEVELS.length };
  }

  function refresh(animate: boolean): void {
    hud.setCoins(win ? win.wallet : state.coins, animate);
    hud.setStreak(state.streak);
    const left = state.stock.length;
    countEl.textContent = String(left);
    stockEl.classList.toggle('empty', left === 0);
    for (const l of layerEls) l.hidden = Number(l.dataset.k) >= Math.min(left, STACK_MAX);
    stockEl.setAttribute('aria-label', `Draw a card, ${left} left`);
    for (const b of boosterEls) b.disabled = reduce(state, { type: b.dataset.booster as Booster }) === state;
    const glowing = playable(state);
    state.layout.slots.forEach((_, i) => board.slot(i).classList.toggle('playable', glowing.includes(i)));
  }

  /** Runs once no card is in flight: shows the discard top and any end-of-level dialog. */
  function settle(): void {
    if (inFlight > 0) return;
    showDiscard(top(state));
    const wanted = win ? 'win' : state.status === 'stuck' ? 'stuck' : null;
    if (dialog && dialog.kind !== wanted) closeDialog(); // the state moved on by some other path: never leave it stale
    if (dialog || !wanted) return;
    if (win) {
      dialog = {
        kind: 'win',
        close: showWinDialog(screen, win, {
          next: () => deps.exit(win!.isLast ? 'final' : 'next'),
          replay: redeal,
          map: () => deps.exit('map'),
        }),
      };
      celebrate();
    } else {
      dialog = {
        kind: 'stuck',
        close: showStuckDialog(
          screen,
          {
            canAddFive: reduce(state, { type: 'addFive' }) !== state,
            canWild: reduce(state, { type: 'wild' }) !== state,
          },
          {
            addFive: () => boosterFromDialog({ type: 'addFive' }),
            wild: () => boosterFromDialog({ type: 'wild' }),
            retry: () => {
              persistCoins();
              redeal();
            },
            map: () => {
              persistCoins();
              deps.exit('map');
            },
          },
        ),
      };
    }
    syncModal();
  }

  /** Win: confetti across the screen and a big paw-print burst behind the cheering cat. */
  function celebrate(): void {
    confetti(fx);
    const hero = screen.querySelector<HTMLElement>('.win-hero');
    if (!hero) return;
    const r = hero.getBoundingClientRect();
    sparkleBurst(fx, r.left + r.width / 2, r.top + 48, true); // the 96 px cat tops the hero column
  }

  function closeDialog(): void {
    dialog?.close();
    dialog = null;
    syncModal();
  }

  /** While a dialog is open the playable glow is off (CSS, via `.modal`) and no nudge is armed. */
  function syncModal(): void {
    screen.classList.toggle('modal', dialog !== null);
    armNudge();
  }

  /** (Re)starts the idle-nudge countdown; any input calls this, so only real idleness reaches nudge(). */
  function armNudge(): void {
    clearTimeout(idleTimer);
    idleTimer = dialog || !mounted ? 0 : window.setTimeout(nudge, NUDGE_MS);
  }

  /** Wiggles the first playable card, or the stock if none is playable, then waits for the next idle spell. */
  function nudge(): void {
    if (dialog || !mounted) return;
    const first = playable(state)[0];
    const el = first !== undefined ? board.slot(first) : state.stock.length > 0 ? stockEl : null;
    el?.classList.add('nudge');
    armNudge();
  }

  function boosterFromDialog(action: Action): void {
    closeDialog();
    act(action, stockEl);
  }

  function redeal(): void {
    closeDialog();
    win = null;
    state = deal(level, deps.getSave().coins);
    baseline = state.coins;
    board.destroy();
    board = createBoard(area, state.layout, state.table, onTap);
    refresh(false);
    settle();
  }

  const onVisibility = (): void => {
    if (document.visibilityState === 'hidden') persistCoins();
  };
  const onResize = (): void => board.fit();
  document.addEventListener('visibilitychange', onVisibility);
  // Reload/close: Chromium can fire the unload visibilitychange while still reporting "visible".
  window.addEventListener('pagehide', persistCoins);
  window.addEventListener('resize', onResize);
  // Any input restarts the idle-nudge countdown (capture: taps the game refuses count too).
  document.addEventListener('pointerdown', armNudge, true);
  document.addEventListener('keydown', armNudge, true);
  const endNudge = (e: AnimationEvent): void => {
    if (e.animationName.startsWith('nudge')) (e.target as Element).classList.remove('nudge');
  };
  screen.addEventListener('animationend', endNudge);
  screen.addEventListener('animationcancel', endNudge);

  refresh(false);
  settle();
  armNudge();

  return () => {
    if (!mounted) return;
    mounted = false;
    clearTimeout(idleTimer);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('pointerdown', armNudge, true);
    document.removeEventListener('keydown', armNudge, true);
    window.removeEventListener('pagehide', persistCoins);
    window.removeEventListener('resize', onResize);
    for (const a of screen.getAnimations({ subtree: true })) a.cancel();
    hud.destroy();
    screen.remove();
  };
}

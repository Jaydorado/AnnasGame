/**
 * The playable level: HUD, table, bottom bar (stock, discard, boosters) and dialogs.
 * All rules live in core/game; this screen dispatches actions and animates the difference.
 */
import type { Top } from '../core/cards';
import { ECON, starsFor } from '../core/economy';
import { deal, reduce, top, type Action, type GameState } from '../core/game';
import type { LevelDef } from '../core/level';
import { LEVELS } from '../levels/levels';
import { recordWin, withCoins, type SaveV1 } from '../progress/save';
import { cardBackSvg } from './art/cardArt';
import { cardLabel, createBoard, topSvg } from './board';
import { showStuckDialog, showWinDialog, type WinInfo } from './dialogs';
import { confetti, flyCard, pop, sparkleBurst, wiggle } from './fx';
import { createHud } from './hud';

export interface LevelDeps {
  getSave(): SaveV1;
  setSave(save: SaveV1): void; // caller persists to localStorage
  exit(to: 'map' | 'next' | 'final'): void;
}

type Booster = 'undo' | 'wild' | 'addFive';

const BOOSTERS: readonly { readonly type: Booster; readonly label: string }[] = [
  { type: 'undo', label: `Undo · ${ECON.undoCost}` },
  { type: 'wild', label: `Wild · ${ECON.wildCost}` },
  { type: 'addFive', label: `+${ECON.addFiveCount} · ${ECON.addFiveCost}` },
];

export function mountLevel(root: HTMLElement, level: LevelDef, deps: LevelDeps): () => void {
  let state: GameState = deal(level, deps.getSave().coins);
  let win: WinInfo | null = null; // set once the win is recorded in the save
  let closeDialog: (() => void) | null = null;
  let inFlight = 0; // cards still flying to the discard
  let shownTop: Top | null = null;
  let mounted = true;

  const screen = document.createElement('div');
  screen.className = 'level';
  const hud = createHud(level.id, state.coins, () => {
    persistCoins();
    deps.exit('map');
  });
  const area = document.createElement('main');
  area.className = 'board';
  const bar = document.createElement('footer');
  bar.className = 'bar';
  bar.innerHTML =
    `<div class="piles">` +
    `<button type="button" class="pile stock"><span class="pile-card">${cardBackSvg()}</span><span class="pile-count"></span></button>` +
    `<div class="pile discard" role="img"></div>` +
    `</div>` +
    `<div class="boosters">` +
    BOOSTERS.map((b) => `<button type="button" class="booster" data-booster="${b.type}">${b.label}</button>`).join('') +
    `</div>`;
  const fx = document.createElement('div');
  fx.className = 'fx';
  screen.append(hud.el, area, bar, fx);
  root.append(screen);

  const stockEl = bar.querySelector<HTMLButtonElement>('.stock')!;
  const countEl = bar.querySelector<HTMLElement>('.pile-count')!;
  const discardEl = bar.querySelector<HTMLElement>('.discard')!;
  const boosterEls = [...bar.querySelectorAll<HTMLButtonElement>('.booster')];

  const onTap = (slot: number, el: HTMLButtonElement): void => act({ type: 'play', slot }, el);
  let board = createBoard(area, state.layout, state.table, onTap);
  stockEl.addEventListener('click', () => act({ type: 'draw' }, stockEl));
  for (const b of boosterEls) b.addEventListener('click', () => act({ type: b.dataset.booster as Booster }, b));

  /** Wallet total into the save. A won session was already saved by the win (with any 3-star bonus). */
  function persistCoins(): void {
    if (!win) deps.setSave(withCoins(deps.getSave(), state.coins));
  }

  function act(action: Action, tapped: HTMLElement): void {
    const next = reduce(state, action);
    if (next === state) {
      wiggle(tapped);
      return;
    }
    const prev = state;
    state = next;
    if (action.type === 'play') {
      const from = board.slot(action.slot).getBoundingClientRect();
      board.update(state.table);
      fly(from, topSvg(prev.table[action.slot]!), true);
    } else {
      board.update(state.table);
      if (action.type === 'draw') fly(stockEl.getBoundingClientRect(), topSvg(top(state)), false, cardBackSvg());
      if (action.type === 'addFive') pop(stockEl);
    }
    if (state.status === 'won') recordVictory();
    refresh(true);
    settle();
    if (action.type === 'wild') pop(discardEl);
  }

  /** A card copy flies to the discard; the discard updates once every flight has landed. */
  function fly(from: DOMRect, face: string, sparkle: boolean, back?: string): void {
    const to = discardEl.getBoundingClientRect();
    inFlight++;
    void flyCard(fx, from, to, face, back).then(() => {
      if (!mounted) return;
      inFlight--;
      if (sparkle) sparkleBurst(fx, to.left + to.width / 2, to.top + to.height / 2);
      settle();
    });
  }

  function recordVictory(): void {
    deps.setSave(withCoins(deps.getSave(), state.coins));
    const stars = starsFor(level, state.stock.length);
    const { save, bonus } = recordWin(deps.getSave(), level.id, stars, LEVELS.length);
    deps.setSave(save);
    win = { stars, cardsLeft: state.stock.length, bonus, wallet: save.coins, isLast: level.id === LEVELS.length };
  }

  function refresh(animate: boolean): void {
    hud.setCoins(win ? win.wallet : state.coins, animate);
    hud.setStreak(state.streak);
    const left = state.stock.length;
    countEl.textContent = String(left);
    stockEl.classList.toggle('empty', left === 0);
    stockEl.setAttribute('aria-label', `Draw a card, ${left} left`);
    for (const b of boosterEls) b.disabled = reduce(state, { type: b.dataset.booster as Booster }) === state;
  }

  /** Runs once no card is in flight: shows the discard top and any end-of-level dialog. */
  function settle(): void {
    if (inFlight > 0) return;
    const t = top(state);
    if (t !== shownTop) {
      shownTop = t;
      discardEl.innerHTML = topSvg(t);
      discardEl.setAttribute('aria-label', `Discard: ${cardLabel(t)}`);
    }
    if (closeDialog) return;
    if (win) {
      closeDialog = showWinDialog(screen, win, {
        next: () => deps.exit(win!.isLast ? 'final' : 'next'),
        replay: redeal,
        map: () => deps.exit('map'),
      });
      confetti(fx);
    } else if (state.status === 'stuck') {
      closeDialog = showStuckDialog(
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
      );
    }
  }

  function boosterFromDialog(action: Action): void {
    closeDialog!();
    closeDialog = null;
    act(action, stockEl);
  }

  function redeal(): void {
    closeDialog?.();
    closeDialog = null;
    win = null;
    state = deal(level, deps.getSave().coins);
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

  refresh(false);
  settle();

  return () => {
    if (!mounted) return;
    mounted = false;
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', persistCoins);
    window.removeEventListener('resize', onResize);
    for (const a of screen.getAnimations({ subtree: true })) a.cancel();
    hud.destroy();
    screen.remove();
  };
}

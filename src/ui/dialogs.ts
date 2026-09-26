/** Modal dialogs over the level screen. Each `show*` returns a function that closes it. */
import { ECON } from '../core/economy';
import type { Stars } from '../progress/save';
import { catHeadSvg } from './art/catArt';

export interface WinInfo {
  readonly stars: Stars;
  readonly cardsLeft: number;
  readonly bonus: number; // 3-star bonus paid by this win, 0 if none
  readonly wallet: number;
  readonly isLast: boolean;
}

export interface StuckInfo {
  readonly canAddFive: boolean;
  readonly canWild: boolean;
}

type Handlers = Record<string, () => void>;

/**
 * The dialog is truly modal: the host's other children are inert (no pointer, focus or activation)
 * and Tab wraps within the dialog. Closing restores them and returns focus to the opener if it is still there.
 */
function openDialog(host: HTMLElement, cls: string, body: string, on: Handlers): () => void {
  const opener = document.activeElement;
  const background = [...host.children].filter((el): el is HTMLElement => el instanceof HTMLElement && !el.inert);
  for (const el of background) el.inert = true;
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `<div class="dialog ${cls}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${body}</div>`;
  backdrop.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-act]');
    if (b && !b.disabled) on[b.dataset.act!]();
  });
  backdrop.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const buttons = [...backdrop.querySelectorAll<HTMLButtonElement>('button:enabled')];
    const edge = e.shiftKey ? buttons[0] : buttons[buttons.length - 1];
    if (edge && document.activeElement === edge) {
      e.preventDefault();
      (e.shiftKey ? buttons[buttons.length - 1] : buttons[0])!.focus({ preventScroll: true });
    }
  });
  host.append(backdrop);
  backdrop.querySelector<HTMLButtonElement>('button:enabled')?.focus({ preventScroll: true });
  return () => {
    backdrop.remove();
    for (const el of background) el.inert = false;
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
  };
}

export function showWinDialog(
  host: HTMLElement,
  info: WinInfo,
  on: { next(): void; replay(): void; map(): void },
): () => void {
  const stars = [1, 2, 3]
    .map((n) => `<span class="star${n <= info.stars ? ' earned' : ''}" style="--i:${n}">★</span>`)
    .join('');
  const stockBonus = info.cardsLeft * ECON.perStockLeft;
  const lines = [
    `<li><span>Level clear</span><span>+${ECON.winBonus}</span></li>`,
    `<li><span>Cards left ${info.cardsLeft} × ${ECON.perStockLeft}</span><span>= +${stockBonus}</span></li>`,
    info.bonus > 0 ? `<li><span>3-star bonus</span><span>+${info.bonus}</span></li>` : '',
  ].join('');
  // Landscape: the cat, title and stars on the left; the coin lines and the actions on the right.
  return openDialog(
    host,
    'win',
    `<div class="win-hero">` +
      `<div class="win-cat">${catHeadSvg()}</div>` +
      `<h2 id="dialog-title">Level clear!</h2>` +
      `<div class="stars" role="img" aria-label="${info.stars} of 3 stars">${stars}</div>` +
      `</div>` +
      `<div class="win-body">` +
      `<ul class="breakdown">${lines}</ul>` +
      `<p class="wallet"><span class="coin" aria-hidden="true"></span>${info.wallet}</p>` +
      `<div class="dialog-actions">` +
      `<button type="button" class="primary" data-act="next">${info.isLast ? 'The end ♥' : 'Next'}</button>` +
      `<button type="button" data-act="replay">Replay</button>` +
      `<button type="button" data-act="map">Map</button>` +
      `</div>` +
      `</div>`,
    on,
  );
}

export function showStuckDialog(
  host: HTMLElement,
  info: StuckInfo,
  on: { addFive(): void; wild(): void; retry(): void; map(): void },
): () => void {
  return openDialog(
    host,
    'stuck',
    `<h2 id="dialog-title">Out of moves</h2>` +
      `<p>Add a few cards or place a Wild to keep going, or start the level again.</p>` +
      `<div class="dialog-actions">` +
      `<button type="button" class="boost" data-act="addFive"${info.canAddFive ? '' : ' disabled'}>+${ECON.addFiveCount} cards · ${ECON.addFiveCost}</button>` +
      `<button type="button" class="boost" data-act="wild"${info.canWild ? '' : ' disabled'}>Wild · ${ECON.wildCost}</button>` +
      `<button type="button" class="primary" data-act="retry">Retry</button>` +
      `<button type="button" data-act="map">Map</button>` +
      `</div>`,
    on,
  );
}

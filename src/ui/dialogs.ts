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

function openDialog(host: HTMLElement, cls: string, body: string, on: Handlers): () => void {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `<div class="dialog ${cls}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${body}</div>`;
  backdrop.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button[data-act]');
    if (b && !b.disabled) on[b.dataset.act!]();
  });
  host.append(backdrop);
  backdrop.querySelector<HTMLButtonElement>('button:enabled')?.focus({ preventScroll: true });
  return () => backdrop.remove();
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
  return openDialog(
    host,
    'win',
    `<div class="win-cat">${catHeadSvg()}</div>` +
      `<h2 id="dialog-title">Level clear!</h2>` +
      `<div class="stars" role="img" aria-label="${info.stars} of 3 stars">${stars}</div>` +
      `<ul class="breakdown">${lines}</ul>` +
      `<p class="wallet"><span class="coin" aria-hidden="true"></span>${info.wallet}</p>` +
      `<div class="dialog-actions">` +
      `<button type="button" class="primary" data-act="next">${info.isLast ? 'The end ♥' : 'Next'}</button>` +
      `<button type="button" data-act="replay">Replay</button>` +
      `<button type="button" data-act="map">Map</button>` +
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
      `<button type="button" data-act="addFive"${info.canAddFive ? '' : ' disabled'}>+${ECON.addFiveCount} cards · ${ECON.addFiveCost}</button>` +
      `<button type="button" data-act="wild"${info.canWild ? '' : ' disabled'}>Wild · ${ECON.wildCost}</button>` +
      `<button type="button" data-act="retry">Retry</button>` +
      `<button type="button" data-act="map">Map</button>` +
      `</div>`,
    on,
  );
}

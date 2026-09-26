/**
 * The table: one absolutely positioned card button per layout slot, keyed by slot index
 * (never by rank+suit: +5 cards may duplicate dealt cards).
 */
import type { Card, Top } from '../core/cards';
import { isExposed, type Layout } from '../core/layout';
import { cardBackSvg, cardFaceSvg, wildCardSvg } from './art/cardArt';
import { fitBoard } from './boardFit';
import { hudBoxes } from './frame';

const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export const RANK_NAMES = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'] as const;

/** Accessible name, e.g. "5 of hearts". */
export function cardLabel(t: Top): string {
  return t === 'wild' ? 'wild card' : `${RANK_NAMES[t.rank]} of ${SUIT_NAMES[t.suit]}`;
}

export function topSvg(t: Top): string {
  return t === 'wild' ? wildCardSvg() : cardFaceSvg(t);
}

export interface Board {
  slot(i: number): HTMLButtonElement;
  /** Syncs slots with the table: hides removed cards, flips cards whose exposure changed. */
  update(table: readonly (Card | null)[]): void;
  /** Sizes and places the cards for the board area's current size. */
  fit(): void;
  destroy(): void;
}

export function createBoard(
  area: HTMLElement,
  layout: Layout,
  table: readonly (Card | null)[],
  onTap: (slot: number, el: HTMLButtonElement) => void,
): Board {
  const el = document.createElement('div');
  el.className = 'table';
  const slots = layout.slots.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card';
    b.dataset.slot = String(i);
    b.style.zIndex = String(s.row + 1);
    b.innerHTML =
      `<span class="card-inner"><span class="card-face front"></span>` +
      `<span class="card-face back">${cardBackSvg()}</span></span>`;
    return b;
  });
  // The face is rendered when a card is first exposed, so covered cards stay unknown in the DOM.
  const faces: (Card | null)[] = layout.slots.map(() => null);
  el.append(...slots);
  el.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('button.card');
    if (b) onTap(Number(b.dataset.slot), b);
  });

  const board: Board = {
    slot: (i) => slots[i],
    update(tbl) {
      tbl.forEach((card, i) => {
        const b = slots[i];
        b.hidden = card === null;
        if (!card) return;
        const up = isExposed(layout.slots[i], tbl);
        if (up && faces[i] !== card) {
          b.querySelector('.front')!.innerHTML = cardFaceSvg(card);
          faces[i] = card;
        }
        b.classList.toggle('up', up);
        b.setAttribute('aria-label', up ? cardLabel(card) : 'face-down card');
      });
    },
    fit() {
      const f = fitBoard(area.clientWidth, area.clientHeight, layout, hudBoxes(area.clientWidth));
      layout.slots.forEach((s, i) => {
        const st = slots[i].style;
        st.left = `${f.offsetX + s.x * f.cardW}px`;
        st.top = `${f.offsetY + s.row * f.rowStep * f.cardH}px`;
        st.width = `${f.cardW}px`;
        st.height = `${f.cardH}px`;
      });
    },
    destroy: () => el.remove(),
  };
  // Initial state is applied before insertion so nothing transitions on deal.
  board.update(table);
  area.append(el);
  board.fit();
  return board;
}

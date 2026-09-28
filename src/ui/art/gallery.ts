/**
 * Dev-only art gallery (gallery.html) on the wooden table: every card face, the back, the Wild,
 * the face-down board state and the stock's stacked edge at landscape play size (64 px), the
 * 60 px readability floor, one row at 100 px, and the icons.
 */
import '../styles.css';
import { fullDeck, type Card, type Suit } from '../../core/cards';
import { cardBackSvg, cardFaceSvg, wildCardSvg } from './cardArt';
import { catHeadSvg, catPortraitSvg, fishSvg, heartSvg, pawSvg, yarnBallSvg } from './catArt';
import { BADGE_OVERHANG, BADGE_RISE, PILE_GAP, STACK_MAX, STACK_STEP, STACK_W } from '../frame';
import { basketCatSvg, cushionSvg } from './tableArt';

const PLAY_W = 64;

function section(title: string, width: number, items: readonly string[]): string {
  return (
    `<h2>${title}</h2><div class="grid" style="--w:${width}px">` +
    items.map((svg) => `<div class="cell">${svg}</div>`).join('') +
    `</div>`
  );
}

const c = (rank: number, suit: Suit): Card => ({ rank, suit });
const SAMPLE = [c(1, 0), c(10, 1), c(12, 2), c(13, 3), c(11, 1), c(7, 0), c(8, 2)].map(cardFaceSvg);

/** A small peak dealt like the board: rows of backs, the bottom row face up, rows `step` card heights apart. */
function peak(step: number): string {
  const h = PLAY_W * 1.4;
  const rows: readonly (readonly number[])[] = [[1.5], [1, 2], [0.5, 1.5, 2.5], [0, 1, 2, 3]];
  const faces = [c(4, 3), c(9, 1), c(12, 0), c(1, 2)];
  const cards = rows.flatMap((xs, row) =>
    xs.map((x, i) => {
      const up = row === rows.length - 1;
      const pos = `left:${x * PLAY_W}px;top:${row * step * h}px;width:${PLAY_W}px;height:${h}px;z-index:${row + 1}`;
      return (
        `<span class="card${up ? ' up' : ''}" style="${pos}"><span class="card-inner">` +
        `<span class="card-face front">${up ? cardFaceSvg(faces[i]) : ''}</span>` +
        `<span class="card-face back">${cardBackSvg()}</span></span></span>`
      );
    }),
  );
  return `<div class="peak" style="width:${4 * PLAY_W}px;height:${3 * step * h + h}px">${cards.join('')}</div>`;
}

/** The level screen's bottom strip markup at play size: stacked stock (with `left` cards) and the discard. */
function strip(left: number, top: string): string {
  const layers = Array.from({ length: STACK_MAX }, (_, i) => STACK_MAX - 1 - i)
    .map((k) => `<span class="pile-card" data-k="${k}" style="--k:${k}"${k >= Math.min(left, STACK_MAX) ? ' hidden' : ''}>${cardBackSvg()}</span>`)
    .join('');
  const vars =
    `--pile-w:${PLAY_W}px;--pile-h:${PLAY_W * 1.4}px;--pile-gap:${PILE_GAP}px;--stack-step:${STACK_STEP}px;` +
    `--stack-w:${STACK_W}px;--badge-rise:${BADGE_RISE}px;--badge-overhang:${BADGE_OVERHANG}px`;
  return (
    `<div class="piles" style="${vars}"><span class="pile stock${left === 0 ? ' empty' : ''}">${layers}` +
    `<span class="pile-count">${left}</span></span><span class="pile discard">${top}</span></div>`
  );
}

document.querySelector<HTMLElement>('#gallery')!.innerHTML =
  section(`Faces · ${PLAY_W} px`, PLAY_W, fullDeck().map(cardFaceSvg)) +
  section(`Back, Wild · ${PLAY_W} px`, PLAY_W, [cardBackSvg(), wildCardSvg()]) +
  section('Readability floor · 60 px', 60, [...SAMPLE, cardBackSvg(), wildCardSvg()]) +
  section('100 px', 100, [...SAMPLE, cardBackSvg(), wildCardSvg()]) +
  `<h2>Board: face-down rows at step 0.5 and 0.25 · stock stacked edge (23, 3, empty)</h2>` +
  `<div class="row">${peak(0.5)}${peak(0.25)}` +
  `<div class="strips">${strip(23, cardFaceSvg(c(5, 1)))}${strip(3, wildCardSvg())}${strip(0, cardFaceSvg(c(13, 0)))}</div></div>` +
  section('Icons and table props', 48, [
    catPortraitSvg('kitten'),
    catPortraitSvg('bow'),
    catPortraitSvg('crown'),
    catHeadSvg(),
    pawSvg(),
    yarnBallSvg(),
    heartSvg(),
    fishSvg(),
  ]) +
  `<div class="row props"><span class="prop-cell">${basketCatSvg()}</span><span class="prop-cell">${cushionSvg()}</span></div>`;

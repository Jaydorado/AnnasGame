/**
 * Card faces, back and Wild as SVG markup (viewBox 0 0 100 140, no fixed size).
 * Colors are literal hex (mirroring styles.css) because the strings are inlined.
 */
import { RANK_LABELS, type Card, type Suit } from '../../core/cards';
import { HEART_PATH, PALETTE, catPortraitShapes, pawShapes, type CatKind } from './catArt';

const { night, night2, gold, pink, cream, suitRed, suitDark } = PALETTE;
const FONT = `system-ui, 'Segoe UI', Roboto, sans-serif`;
const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const RANK_NAMES = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'] as const;
const COURT_CATS: Record<number, CatKind> = { 11: 'kitten', 12: 'bow', 13: 'crown' };
/** Card outline inset by half the border width so the stroke stays inside the viewBox. */
const CARD_RECT = 'x="1.25" y="1.25" width="97.5" height="137.5" rx="8"';

/** Suit shapes in a 0..100 box. */
const SUIT_SHAPES: Record<Suit, string> = {
  0: '<path d="M50 5 C78 30 94 44 94 61 C94 75 83 83 72 83 C63 83 56 79 53 73 C54 83 58 91 67 96 L33 96 C42 91 46 83 47 73 C44 79 37 83 28 83 C17 83 6 75 6 61 C6 44 22 30 50 5 Z"/>',
  1: `<path d="${HEART_PATH}"/>`,
  2: '<path d="M50 3 Q64 30 88 50 Q64 70 50 97 Q36 70 12 50 Q36 30 50 3 Z"/>',
  3: '<circle cx="50" cy="29" r="20"/><circle cx="27" cy="57" r="20"/><circle cx="73" cy="57" r="20"/><circle cx="50" cy="52" r="12"/><path d="M46 58 C46 76 41 88 32 96 L68 96 C59 88 54 76 54 58 Z"/>',
};

/** Unique id suffixes: gradients/masks must not collide when many cards are inlined in one document. */
let idSeq = 0;

function svgCard(label: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" role="img" aria-label="${label}">${body}</svg>`;
}

/** Suit shape placed in a `size`-wide box at (x, y). */
function suitAt(suit: Suit, x: number, y: number, size: number): string {
  return `<g transform="translate(${x} ${y}) scale(${size / 100})">${SUIT_SHAPES[suit]}</g>`;
}

export function cardFaceSvg(card: Card): string {
  const color = card.suit === 1 || card.suit === 2 ? suitRed : suitDark;
  const label = RANK_LABELS[card.rank];
  // "10" is squeezed to the width of the single-character ranks.
  const fit = label.length > 1 ? ' textLength="30" lengthAdjust="spacingAndGlyphs"' : '';
  const corner =
    `<text x="17" y="30" text-anchor="middle" font-family="${FONT}" font-size="27" font-weight="800"${fit}>${label}</text>` +
    suitAt(card.suit, 8, 35, 18);
  const kind = COURT_CATS[card.rank];
  let centre: string;
  if (kind) {
    centre = `<g transform="translate(16 38) scale(0.68)">${catPortraitShapes(kind, color)}</g>`;
  } else if (card.rank === 1) {
    centre = suitAt(card.suit, 27, 40, 46) + `<g transform="translate(41 91) scale(0.18)">${pawShapes(color)}</g>`;
  } else {
    centre = suitAt(card.suit, 30, 50, 40);
  }
  return svgCard(
    `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`,
    `<rect ${CARD_RECT} fill="${cream}" stroke="${gold}" stroke-width="2.5"/>` +
      `<g fill="${color}">${corner}<g transform="rotate(180 50 70)">${corner}</g>${centre}</g>`,
  );
}

const BACK_STARS: readonly (readonly [number, number, number])[] = [
  [16, 18, 1.4], [30, 11, 1], [44, 24, 1.2], [56, 12, 0.9], [22, 40, 1], [12, 62, 1.3], [36, 50, 0.9],
  [88, 56, 1.2], [66, 58, 1], [90, 84, 0.9], [26, 82, 1.1], [86, 12, 0.8], [52, 40, 0.8], [76, 76, 1],
];

export function cardBackSvg(): string {
  const n = ++idSeq;
  const sky = `sd-sky-${n}`;
  const clip = `sd-clip-${n}`;
  const moon = `sd-moon-${n}`;
  const stars = BACK_STARS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  return svgCard(
    'card back',
    `<defs>` +
      `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night}"/><stop offset="1" stop-color="${night2}"/></linearGradient>` +
      `<clipPath id="${clip}"><rect ${CARD_RECT}/></clipPath>` +
      `<mask id="${moon}"><circle cx="72" cy="32" r="14" fill="#fff"/><circle cx="79" cy="26" r="12" fill="#000"/></mask>` +
      `</defs>` +
      `<g clip-path="url(#${clip})">` +
      `<rect width="100" height="140" fill="url(#${sky})"/>` +
      `<g fill="${cream}" opacity="0.9">${stars}</g>` +
      `<path d="M40 30 L41.2 33.8 L45 35 L41.2 36.2 L40 40 L38.8 36.2 L35 35 L38.8 33.8 Z" fill="${gold}"/>` +
      `<circle cx="72" cy="32" r="14" fill="${gold}" mask="url(#${moon})"/>` +
      // Rooftop with a chimney, and the cat sitting on the ridge.
      `<g fill="#070b1c">` +
      `<path d="M0 140 L0 121 L50 105 L100 121 L100 140 Z"/><rect x="72" y="99" width="9" height="17"/>` +
      `<ellipse cx="50" cy="93" rx="11" ry="13"/><circle cx="50" cy="75" r="8.5"/>` +
      `<path d="M42.5 73 L43 62.5 L49 69 Z M57.5 73 L57 62.5 L51 69 Z" stroke="#070b1c" stroke-width="1.5" stroke-linejoin="round"/>` +
      `</g>` +
      `<path d="M59 101 C70 104 74 94 67 88" fill="none" stroke="#070b1c" stroke-width="3.5" stroke-linecap="round"/>` +
      `<circle cx="46.5" cy="75" r="1.4" fill="${gold}"/><circle cx="53.5" cy="75" r="1.4" fill="${gold}"/>` +
      `<path d="M0 121 L50 105 L100 121" fill="none" stroke="${night2}" stroke-width="1.2"/>` +
      `</g>` +
      `<rect x="6" y="6" width="88" height="128" rx="5" fill="none" stroke="${gold}" stroke-opacity="0.45"/>` +
      `<rect ${CARD_RECT} fill="none" stroke="${gold}" stroke-width="2.5"/>`,
  );
}

export function wildCardSvg(): string {
  const glow = `sd-wild-${++idSeq}`;
  return svgCard(
    'wild card',
    `<defs><linearGradient id="${glow}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${gold}"/><stop offset="1" stop-color="${pink}"/></linearGradient></defs>` +
      `<rect ${CARD_RECT} fill="url(#${glow})" stroke="${cream}" stroke-width="2.5"/>` +
      `<g fill="${cream}"><circle cx="16" cy="18" r="2"/><circle cx="84" cy="24" r="1.6"/><circle cx="20" cy="96" r="1.6"/><circle cx="82" cy="92" r="2"/></g>` +
      `<g transform="translate(20 18) scale(0.6)">${pawShapes(night2)}</g>` +
      `<text x="50" y="120" text-anchor="middle" font-family="${FONT}" font-size="25" font-weight="900" letter-spacing="1" fill="${night}">WILD</text>`,
  );
}

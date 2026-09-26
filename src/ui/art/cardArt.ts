/**
 * Card faces, back and Wild as SVG markup (viewBox 0 0 100 140, no fixed size).
 * Cartoon style: white face, huge bold centred rank, small rank + pip in the top-left corner;
 * glossy blue back with a paw emblem. Colors are literal hex because the strings are inlined.
 */
import { RANK_LABELS, type Card, type Suit } from '../../core/cards';
import { HEART_PATH, catPortraitShapes, pawShapes, type CatKind } from './catArt';

const RED = '#e8335a';
const NAVY = '#1f2a55';
const RIM = '#d8cec4'; // warm-grey card border
const WHITE = '#ffffff';
const FACE_LOW = '#f6f1ea'; // bottom of the face's faint top-to-bottom shading
const BLUE_TOP = '#4ea6ff';
const BLUE_MID = '#2b7de9';
const BLUE_LOW = '#1a5ccc';
const BLUE_LINE = '#b5dcff';
const GINGER = '#f2a65a';
/** Chunky rounded stack; all system fonts, nothing is downloaded. */
const FONT = `ui-rounded, 'SF Pro Rounded', 'Nunito', 'Arial Rounded MT Bold', 'Varela Round', system-ui, sans-serif`;
const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
const RANK_NAMES = ['', 'Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'] as const;
const COURT_CATS: Record<number, CatKind> = { 11: 'kitten', 12: 'bow', 13: 'crown' };
/** Card outline (radius 10% of the width), inset by half the border so the stroke stays inside the viewBox. */
const CARD_RECT = 'x="0.75" y="0.75" width="98.5" height="138.5" rx="10"';

/** Suit shapes in a 0..100 box. */
const SUIT_SHAPES: Record<Suit, string> = {
  0: '<path d="M50 5 C78 30 94 44 94 61 C94 75 83 83 72 83 C63 83 56 79 53 73 C54 83 58 91 67 96 L33 96 C42 91 46 83 47 73 C44 79 37 83 28 83 C17 83 6 75 6 61 C6 44 22 30 50 5 Z"/>',
  1: `<path d="${HEART_PATH}"/>`,
  2: '<path d="M50 3 Q64 30 88 50 Q64 70 50 97 Q36 70 12 50 Q36 30 50 3 Z"/>',
  3: '<circle cx="50" cy="29" r="20"/><circle cx="27" cy="57" r="20"/><circle cx="73" cy="57" r="20"/><circle cx="50" cy="52" r="12"/><path d="M46 58 C46 76 41 88 32 96 L68 96 C59 88 54 76 54 58 Z"/>',
};

/** Unique id suffixes: gradients/clips must not collide when many cards are inlined in one document. */
let idSeq = 0;

function svgCard(label: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" role="img" aria-label="${label}">${body}</svg>`;
}

/** Suit shape placed in a `size`-wide box at (x, y). */
function suitAt(suit: Suit, x: number, y: number, size: number): string {
  return `<g transform="translate(${x} ${y}) scale(${size / 100})">${SUIT_SHAPES[suit]}</g>`;
}

/** Bold text thickened by a same-colour stroke painted under the fill, so thin fallback fonts still read chunky. */
function boldText(x: number, y: number, size: number, text: string, extra = '', stroke = size / 30): string {
  return (
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${size}" font-weight="900"` +
    ` stroke-width="${stroke}" stroke-linejoin="round" paint-order="stroke"${extra}>${text}</text>`
  );
}

export function cardFaceSvg(card: Card): string {
  const color = card.suit === 1 || card.suit === 2 ? RED : NAVY;
  const label = RANK_LABELS[card.rank];
  const shade = `sd-face-${++idSeq}`;
  // "10" is squeezed to roughly the width of the single-character ranks.
  const ten = label.length > 1;
  const corner =
    boldText(18, 29, 27, label, ten ? ' textLength="25" lengthAdjust="spacingAndGlyphs"' : '') +
    suitAt(card.suit, ten ? 33 : 31, 9, 21);
  const big = ten
    ? boldText(50, 121, 78, label, ' textLength="84" lengthAdjust="spacingAndGlyphs"')
    : boldText(50, 122, 88, label);
  const kind = COURT_CATS[card.rank];
  // Court cards get a small cat in the top-right corner; it never shrinks the rank.
  const cat = kind ? `<g transform="translate(69 5) scale(0.27)">${catPortraitShapes(kind, color)}</g>` : '';
  return svgCard(
    `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`,
    `<defs><linearGradient id="${shade}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="${WHITE}"/><stop offset="1" stop-color="${FACE_LOW}"/></linearGradient></defs>` +
      `<rect ${CARD_RECT} fill="url(#${shade})" stroke="${RIM}" stroke-width="1.5"/>` +
      `<g fill="${color}" stroke="${color}">${corner}${big}</g>` +
      cat,
  );
}

/** White rim, blue panel, lighter inner border and a glossy highlight: shared by the back and the Wild. */
function panelCard(label: string, panelFill: string, defs: string, inner: string): string {
  return svgCard(
    label,
    `<defs>${defs}</defs>` +
      `<rect ${CARD_RECT} fill="${WHITE}" stroke="${RIM}" stroke-width="1.5"/>` +
      `<rect x="6" y="6" width="88" height="128" rx="6" fill="${panelFill}"/>` +
      inner +
      `<path d="M12 6 L88 6 Q94 6 94 12 L94 38 C70 52 38 60 6 62 L6 12 Q6 6 12 6 Z" fill="${WHITE}" opacity="0.16"/>`,
  );
}

export function cardBackSvg(): string {
  const blue = `sd-back-${++idSeq}`;
  return panelCard(
    'card back',
    `url(#${blue})`,
    `<linearGradient id="${blue}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${BLUE_TOP}"/><stop offset="0.5" stop-color="${BLUE_MID}"/><stop offset="1" stop-color="${BLUE_LOW}"/></linearGradient>`,
    `<rect x="11.5" y="11.5" width="77" height="117" rx="4" fill="none" stroke="${BLUE_LINE}" stroke-width="2" opacity="0.8"/>` +
      `<g transform="translate(29 49) scale(0.42)" opacity="0.6">${pawShapes(BLUE_LINE)}</g>`,
  );
}

/** Four-point twinkle centred at (x, y). */
function twinkle(x: number, y: number, r: number): string {
  const q = r * 0.28;
  return `<path d="M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r} Z"/>`;
}

export function wildCardSvg(): string {
  const glow = `sd-wild-${++idSeq}`;
  return panelCard(
    'wild card',
    `url(#${glow})`,
    `<linearGradient id="${glow}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#ffd84d"/><stop offset="0.55" stop-color="#ff9a6b"/><stop offset="1" stop-color="#ff5f97"/></linearGradient>`,
    `<g fill="${WHITE}">${twinkle(17, 20, 6)}${twinkle(84, 28, 4.5)}${twinkle(20, 84, 4)}${twinkle(83, 80, 5.5)}</g>` +
      `<g transform="translate(17 12) scale(0.66)">${catPortraitShapes('kitten', GINGER)}</g>` +
      `<g fill="${WHITE}" stroke="${NAVY}">` +
      boldText(50, 117, 31, 'WILD', ' textLength="76" lengthAdjust="spacingAndGlyphs"', 6) +
      `</g>`,
  );
}

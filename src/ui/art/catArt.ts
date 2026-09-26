/**
 * Code-drawn cat art. Every function returns SVG markup; root <svg> elements carry a
 * viewBox and no width/height so CSS sizes them. Colors are literal hex because the
 * strings are inlined (they mirror the custom properties in styles.css).
 */

export type CatKind = 'kitten' | 'bow' | 'crown';

export const PALETTE = {
  night: '#141d3b',
  night2: '#22306b',
  gold: '#f4c95d',
  pink: '#f7a8c4',
  cream: '#fff8ef',
  suitRed: '#d6336c',
  suitDark: '#1b2a4a',
} as const;

const ROSE = '#e0709a';
const GOLD_DARK = '#b8862b';
const GINGER = '#f2a65a';
const GINGER_DARK = '#d9803a';

function svgRoot(viewBox: string, label: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}">${body}</svg>`;
}

interface FaceOptions {
  fur: string;
  /** Mouth and whisker color; must contrast with `fur`. */
  line: string;
  eyes: string;
  /** Drawn over the face. */
  extras?: string;
  headR?: number;
}

/** Shared round cat face in a 0..100 box: triangle ears, circle head, nose, mouth, whiskers. */
function catFace({ fur, line, eyes, extras = '', headR = 30 }: FaceOptions): string {
  const { pink } = PALETTE;
  return (
    `<path d="M22 46 L25 10 L48 30 Z M78 46 L75 10 L52 30 Z" fill="${fur}" stroke="${fur}" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M28 38 L29.5 20 L42 31 Z M72 38 L70.5 20 L58 31 Z" fill="${pink}" stroke="${pink}" stroke-width="2" stroke-linejoin="round"/>` +
    `<circle cx="50" cy="58" r="${headR}" fill="${fur}"/>` +
    eyes +
    `<path d="M45.5 64 L54.5 64 L50 69 Z" fill="${pink}" stroke="${pink}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M50 69 Q50 74 45 74 M50 69 Q50 74 55 74" fill="none" stroke="${line}" stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M33 66 L16 62 M33 71 L16 73 M67 66 L84 62 M67 71 L84 73" fill="none" stroke="${line}" stroke-width="2.5" stroke-linecap="round"/>` +
    extras
  );
}

/** Portrait shapes (no <svg> root) in a 0..100 box, fur drawn in `color`. Used by the court cards. */
export function catPortraitShapes(kind: CatKind, color: string): string {
  const { cream, night, pink, gold, suitRed } = PALETTE;
  const blush = `<circle cx="30" cy="62" r="4.5" fill="${pink}" opacity="0.75"/><circle cx="70" cy="62" r="4.5" fill="${pink}" opacity="0.75"/>`;
  switch (kind) {
    case 'kitten':
      return catFace({
        fur: color,
        line: cream,
        headR: 28,
        eyes:
          `<circle cx="38" cy="52" r="8" fill="${cream}"/><circle cx="62" cy="52" r="8" fill="${cream}"/>` +
          `<circle cx="39" cy="53" r="5" fill="${night}"/><circle cx="63" cy="53" r="5" fill="${night}"/>` +
          `<circle cx="40.8" cy="51" r="1.8" fill="${cream}"/><circle cx="64.8" cy="51" r="1.8" fill="${cream}"/>`,
        extras: `<path d="M43 32 L46.5 22 L50 31 L53.5 22 L57 32 Z" fill="${color}" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>` + blush,
      });
    case 'bow':
      return catFace({
        fur: color,
        line: cream,
        eyes:
          `<path d="M31 54 Q38 45 45 54 M55 54 Q62 45 69 54" fill="none" stroke="${cream}" stroke-width="3.5" stroke-linecap="round"/>` +
          `<path d="M31 54 L26.5 50.5 M69 54 L73.5 50.5" fill="none" stroke="${cream}" stroke-width="2.5" stroke-linecap="round"/>`,
        extras:
          blush +
          `<g transform="rotate(-18 72 26)">` +
          `<path d="M72 26 L54 13 L54 39 Z M72 26 L90 13 L90 39 Z" fill="${pink}" stroke="${ROSE}" stroke-width="2.5" stroke-linejoin="round"/>` +
          `<circle cx="72" cy="26" r="5.5" fill="${ROSE}"/></g>`,
      });
    case 'crown':
      return catFace({
        fur: color,
        line: cream,
        eyes:
          `<ellipse cx="38" cy="53" rx="7" ry="6" fill="${cream}"/><ellipse cx="62" cy="53" rx="7" ry="6" fill="${cream}"/>` +
          `<ellipse cx="38" cy="53" rx="2.2" ry="5" fill="${night}"/><ellipse cx="62" cy="53" rx="2.2" ry="5" fill="${night}"/>`,
        extras:
          `<path d="M33 33 L31 9 L41.5 20 L50 5 L58.5 20 L69 9 L67 33 Z" fill="${gold}" stroke="${GOLD_DARK}" stroke-width="2.5" stroke-linejoin="round"/>` +
          `<circle cx="31" cy="9" r="3" fill="${pink}"/><circle cx="50" cy="5" r="3" fill="${pink}"/><circle cx="69" cy="9" r="3" fill="${pink}"/>` +
          `<circle cx="50" cy="26" r="3.5" fill="${suitRed}"/>`,
      });
  }
}

/** Standalone cat portrait (ginger fur). */
export function catPortraitSvg(kind: CatKind): string {
  return svgRoot('0 0 100 100', `${kind} cat`, catPortraitShapes(kind, GINGER));
}

/** Friendly ginger cat head: map marker, win dialog, app icon source. */
export function catHeadSvg(): string {
  const { night, cream } = PALETTE;
  return svgRoot(
    '0 0 100 100',
    'cat',
    catFace({
      fur: GINGER,
      line: night,
      eyes:
        `<circle cx="38" cy="53" r="5.5" fill="${night}"/><circle cx="62" cy="53" r="5.5" fill="${night}"/>` +
        `<circle cx="39.8" cy="51.2" r="1.8" fill="${cream}"/><circle cx="63.8" cy="51.2" r="1.8" fill="${cream}"/>`,
      extras: `<path d="M44 30 L45 38 M50 28.5 L50 37 M56 30 L55 38" fill="none" stroke="${GINGER_DARK}" stroke-width="3.5" stroke-linecap="round"/>`,
    }),
  );
}

/**
 * The win dialog's cheering cat: happy closed eyes, open smile, blushing cheeks, both paws raised.
 * Each arm is a `.cheer-arm` group (left/right) so CSS can wave it around its shoulder.
 */
export function cheerCatSvg(): string {
  const { night, cream, pink } = PALETTE;
  const arm = (side: 'l' | 'r', sx: number, px: number): string =>
    `<g class="cheer-arm cheer-arm-${side}">` +
    `<path d="M${sx} 78 L${px} 34" stroke="${GINGER}" stroke-width="11" stroke-linecap="round"/>` +
    `<circle cx="${px}" cy="31" r="8.5" fill="${GINGER}"/>` +
    `<circle cx="${px}" cy="32.5" r="3.6" fill="${pink}"/>` +
    `</g>`;
  return svgRoot(
    '0 0 100 100',
    'cheering cat',
    arm('l', 38, 15) +
      arm('r', 62, 85) +
      `<ellipse cx="50" cy="88" rx="23" ry="14" fill="${GINGER}"/>` +
      `<ellipse cx="50" cy="91" rx="12" ry="8" fill="${cream}"/>` +
      `<g transform="translate(14 4) scale(0.72)">` +
      catFace({
        fur: GINGER,
        line: night,
        eyes: `<path d="M31 55 Q38 45 45 55 M55 55 Q62 45 69 55" fill="none" stroke="${night}" stroke-width="4.5" stroke-linecap="round"/>`,
        extras:
          `<path d="M44 30 L45 38 M50 28.5 L50 37 M56 30 L55 38" fill="none" stroke="${GINGER_DARK}" stroke-width="3.5" stroke-linecap="round"/>` +
          `<ellipse cx="29" cy="66" rx="6" ry="4" fill="${ROSE}" opacity="0.6"/><ellipse cx="71" cy="66" rx="6" ry="4" fill="${ROSE}" opacity="0.6"/>` +
          `<path d="M42 70 Q50 88 58 70 Q50 73 42 70 Z" fill="#8a2a3a" stroke="${night}" stroke-width="2" stroke-linejoin="round"/>` +
          `<path d="M45.5 78 Q50 85 54.5 78 Q50 75.5 45.5 78 Z" fill="${pink}"/>`,
      }) +
      `</g>`,
  );
}

/** Paw print shapes (no <svg> root) in a 0..100 box. */
export function pawShapes(color: string): string {
  return (
    `<g fill="${color}">` +
    `<path d="M50 48 C64 48 77 62 77 74 C77 84 69 89 60 87 C55 86 53 84 50 84 C47 84 45 86 40 87 C31 89 23 84 23 74 C23 62 36 48 50 48 Z"/>` +
    `<ellipse cx="21" cy="45" rx="9" ry="11" transform="rotate(-25 21 45)"/>` +
    `<ellipse cx="39" cy="26" rx="9.5" ry="12" transform="rotate(-8 39 26)"/>` +
    `<ellipse cx="61" cy="26" rx="9.5" ry="12" transform="rotate(8 61 26)"/>` +
    `<ellipse cx="79" cy="45" rx="9" ry="11" transform="rotate(25 79 45)"/>` +
    `</g>`
  );
}

export function pawSvg(): string {
  return svgRoot('0 0 100 100', 'paw print', pawShapes(PALETTE.pink));
}

export function yarnBallSvg(): string {
  const { pink } = PALETTE;
  return svgRoot(
    '0 0 100 100',
    'yarn ball',
    `<path d="M74 76 Q88 92 97 82" fill="none" stroke="${ROSE}" stroke-width="3.5" stroke-linecap="round"/>` +
      `<circle cx="48" cy="50" r="36" fill="${pink}" stroke="${ROSE}" stroke-width="3"/>` +
      `<path d="M17 38 Q48 26 78 38 M13 54 Q48 40 84 56 M20 72 Q50 58 78 76 M34 17 Q22 50 40 84 M58 15 Q76 46 60 85" fill="none" stroke="${ROSE}" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="34" cy="32" r="5" fill="#ffffff" opacity="0.55"/>`,
  );
}

/** Heart path in a 0..100 box (also the ♥ suit shape). */
export const HEART_PATH =
  'M50 90 C22 70 6 54 6 34 C6 18 18 8 31 8 C40 8 47 13 50 21 C53 13 60 8 69 8 C82 8 94 18 94 34 C94 54 78 70 50 90 Z';

export function heartSvg(): string {
  return svgRoot('0 0 100 100', 'heart', `<path d="${HEART_PATH}" fill="${PALETTE.suitRed}"/>`);
}

export function fishSvg(): string {
  const { gold, night } = PALETTE;
  return svgRoot(
    '0 0 100 100',
    'fish',
    `<g fill="${gold}" stroke="${GOLD_DARK}" stroke-width="3" stroke-linejoin="round">` +
      `<path d="M70 50 L94 32 L90 50 L94 68 Z"/>` +
      `<path d="M8 50 C20 28 52 24 72 50 C52 76 20 72 8 50 Z"/></g>` +
      `<path d="M44 36 Q50 50 44 64" fill="none" stroke="${GOLD_DARK}" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="25" cy="46" r="4" fill="${night}"/>`,
  );
}

/** Deterministic 0..1 value for an integer, so the skyline is the same on every visit. */
function hash01(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Height of the rooftop strip drawn by `rooftopsSvg`, in px (1 unit = 1 px); `.map-town` in styles.css matches it. */
const TOWN_H = 150;

interface TownLayer {
  seed: number;
  minW: number;
  maxW: number;
  minH: number;
  maxH: number;
  body: string;
  rim: string;
  lit: string;
  unlit: string;
  cats: boolean;
}

/** A little cat silhouette sitting on a roof at (x, y) (its paws), with glowing eyes. */
function roofCat(x: number, y: number, flip: boolean): string {
  const fur = '#0d1030';
  return (
    `<g transform="translate(${x} ${y})${flip ? ' scale(-1 1)' : ''}">` +
    `<path d="M5 -3 Q17 -2 14 -14" fill="none" stroke="${fur}" stroke-width="3" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="-8" rx="7" ry="9" fill="${fur}"/>` +
    `<circle cx="-1" cy="-20" r="6" fill="${fur}"/>` +
    `<path d="M-6.5 -22 L-6 -30 L-1.5 -25 Z M4.5 -22 L4 -30 L-0.5 -25 Z" fill="${fur}"/>` +
    `<circle cx="-3.3" cy="-20.5" r="1.3" fill="#ffd84a"/><circle cx="1.3" cy="-20.5" r="1.3" fill="#ffd84a"/>` +
    `</g>`
  );
}

function townLayer(width: number, l: TownLayer): string {
  let out = '';
  let x = -12;
  for (let i = 0; x < width; i++) {
    const r = (k: number): number => hash01(l.seed * 7919 + i * 31 + k);
    const w = Math.round(l.minW + r(1) * (l.maxW - l.minW));
    const h = Math.round(l.minH + r(2) * (l.maxH - l.minH));
    const top = TOWN_H - h;
    const kind = Math.floor(r(3) * 3); // 0 gable, 1 flat with a chimney, 2 steep tower roof
    const rim = `fill="none" stroke="${l.rim}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"`;
    out += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${l.body}"/>`;
    if (kind === 0) {
      const rh = Math.round(Math.min(26, w * 0.4));
      out +=
        `<path d="M${x - 4} ${top + 1} L${x + w / 2} ${top - rh} L${x + w + 4} ${top + 1} Z" fill="${l.body}"/>` +
        `<path d="M${x - 4} ${top + 1} L${x + w / 2} ${top - rh} L${x + w + 4} ${top + 1}" ${rim}/>`;
    } else if (kind === 1) {
      const cx = Math.round(x + w * 0.72);
      out +=
        `<rect x="${cx}" y="${top - 12}" width="9" height="14" fill="${l.body}"/>` +
        `<path d="M${cx - 1} ${top - 12} H${cx + 10} M${x} ${top} H${x + w}" ${rim}/>`;
      if (l.cats && r(5) < 0.55) out += roofCat(Math.round(x + w * 0.32), top, r(6) < 0.5);
    } else {
      const rh = Math.round(Math.min(44, w * 0.85));
      out +=
        `<path d="M${x + 2} ${top + 1} L${x + w / 2} ${top - rh} L${x + w - 2} ${top + 1} Z" fill="${l.body}"/>` +
        `<path d="M${x + 2} ${top + 1} L${x + w / 2} ${top - rh} L${x + w - 2} ${top + 1}" ${rim}/>`;
    }
    const cols = Math.max(1, Math.floor((w - 8) / 15));
    const rows = Math.max(1, Math.floor((h - 12) / 18));
    const x0 = x + (w - (cols * 15 - 7)) / 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const on = r(10 + row * 7 + col) < 0.32;
        out += `<rect x="${x0 + col * 15}" y="${top + 9 + row * 18}" width="8" height="10" rx="2" fill="${on ? l.lit : l.unlit}"/>`;
      }
    }
    x += w + Math.round(r(4) * 8) - 3;
  }
  return out;
}

/**
 * Night-time rooftops `width` px wide and TOWN_H tall: a hazy far row and a darker near row with
 * warm lit windows, chimneys and a few cat silhouettes. The same `width` always draws the same town.
 */
export function rooftopsSvg(width: number): string {
  const far = townLayer(width, {
    seed: 1, minW: 46, maxW: 84, minH: 58, maxH: 96,
    body: '#2c3170', rim: '#4b52a3', lit: '#f7d589', unlit: '#383e84', cats: false,
  });
  const near = townLayer(width, {
    seed: 2, minW: 64, maxW: 120, minH: 26, maxH: 58,
    body: '#1a1d4a', rim: '#3a3f86', lit: '#ffc45e', unlit: '#262a60', cats: true,
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${TOWN_H}" preserveAspectRatio="xMinYMax slice" aria-hidden="true">` +
    `<g opacity="0.85">${far}</g>${near}</svg>`
  );
}

/** Four-point twinkle star centred on (x, y) with radius r. */
function sparkle(x: number, y: number, r: number, fill: string): string {
  const q = r * 0.28;
  return `<path d="M${x} ${y - r} Q${x + q} ${y - q} ${x + r} ${y} Q${x + q} ${y + q} ${x} ${y + r} Q${x - q} ${y + q} ${x - r} ${y} Q${x - q} ${y - q} ${x} ${y - r} Z" fill="${fill}"/>`;
}

/** The map's night sky in an 800×360 box (drawn with `slice`): a glowing moon and twinkle stars. */
export function nightSkySvg(): string {
  const { cream, gold } = PALETTE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
    `<circle cx="470" cy="84" r="56" fill="#fff3c9" opacity="0.08"/>` +
    `<circle cx="470" cy="84" r="40" fill="#fff3c9" opacity="0.12"/>` +
    `<circle cx="470" cy="84" r="28" fill="#fff1c2"/>` +
    `<circle cx="461" cy="78" r="6" fill="#efdca0"/><circle cx="480" cy="93" r="4.5" fill="#efdca0"/><circle cx="477" cy="72" r="3" fill="#efdca0"/>` +
    `<path d="M448 70 A28 28 0 0 1 466 57" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>` +
    sparkle(250, 70, 7, cream) +
    sparkle(360, 132, 5, gold) +
    sparkle(610, 120, 6, cream) +
    sparkle(140, 150, 5, gold) +
    sparkle(700, 190, 4, cream) +
    sparkle(40, 90, 4, cream) +
    `</svg>`
  );
}

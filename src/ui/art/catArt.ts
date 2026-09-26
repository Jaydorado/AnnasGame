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

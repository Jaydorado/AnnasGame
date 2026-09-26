/**
 * Small glyphs for the level HUD and the booster buttons. SVG markup in a 0..100 box with no fixed
 * size; purely decorative (aria-hidden) because every button carries its own accessible name.
 * White shapes with a dark outline so they read on any glossy button colour.
 */
const OUTLINE = '#1f2a55';

function iconSvg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Chunky left chevron for the back button. */
export function backIconSvg(): string {
  const d = 'M62 18 L30 50 L62 82';
  return iconSvg(
    `<path d="${d}" fill="none" stroke="${OUTLINE}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>` +
      `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
}

/** Undo: a curved arrow turning back to the left. */
function undoShapes(): string {
  const arc = 'M34 44 H62 C76 44 84 54 84 66 C84 78 76 86 62 86 H44';
  const head = 'M40 22 L16 44 L40 66 Z';
  return (
    `<path d="${arc}" fill="none" stroke="${OUTLINE}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${head}" fill="${OUTLINE}" stroke="${OUTLINE}" stroke-width="12" stroke-linejoin="round"/>` +
    `<path d="${arc}" fill="none" stroke="#ffffff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${head}" fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>`
  );
}

/** Wild: a fat five-point star. */
function wildShapes(): string {
  const star = 'M50 8 L61 36 L91 38 L68 57 L76 87 L50 70 L24 87 L32 57 L9 38 L39 36 Z';
  return (
    `<path d="${star}" fill="#ffd84a" stroke="${OUTLINE}" stroke-width="9" stroke-linejoin="round"/>` +
    `<path d="M50 20 L57 38 L44 40 Z" fill="#ffffff" opacity="0.7"/>`
  );
}

/** +5: two fanned card backs. */
function addFiveShapes(): string {
  const card = (x: number, angle: number): string =>
    `<g transform="rotate(${angle} ${x + 18} 80)"><rect x="${x}" y="22" width="36" height="52" rx="7" fill="#ffffff" stroke="${OUTLINE}" stroke-width="7"/>` +
    `<rect x="${x + 7}" y="29" width="22" height="38" rx="4" fill="#4ea6ff"/></g>`;
  return card(18, -14) + card(46, 12);
}

const BOOSTER_ICONS = { undo: undoShapes, wild: wildShapes, addFive: addFiveShapes } as const;

export function boosterIconSvg(type: keyof typeof BOOSTER_ICONS): string {
  return iconSvg(BOOSTER_ICONS[type]());
}

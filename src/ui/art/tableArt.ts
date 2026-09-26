/**
 * Decorative props for the wooden table (level screen corners): a yarn basket with a sleeping cat
 * and a cushion. SVG markup with a viewBox and no fixed size; purely decorative (aria-hidden).
 */
const GINGER = '#f2a65a';
const GINGER_DARK = '#d9803a';
const PINK = '#f7a8c4';
const ROSE = '#e0709a';
const NAVY = '#1f2a55';
const WICKER = '#c7864a';
const WICKER_DARK = '#8f5424';

function propSvg(viewBox: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Wicker basket with a ginger cat curled up asleep in it, and a yarn ball beside it. */
export function basketCatSvg(): string {
  return propSvg(
    '0 0 170 100',
    `<ellipse cx="82" cy="94" rx="72" ry="6" fill="#4a1a04" opacity="0.35"/>` +
      // Cat: curled body, head resting on the rim, ears, closed eyes, tail over the front.
      `<ellipse cx="74" cy="50" rx="46" ry="21" fill="${GINGER}"/>` +
      `<path d="M52 36 Q58 46 54 58 M70 32 Q76 44 72 58 M88 33 Q93 44 90 56" fill="none" stroke="${GINGER_DARK}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M96 36 L99 16 L111 28 Z M118 30 L126 14 L131 33 Z" fill="${GINGER}" stroke="${GINGER}" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="M100 32 L101 22 L108 29 Z M120 30 L125 21 L127 32 Z" fill="${PINK}"/>` +
      `<ellipse cx="114" cy="44" rx="20" ry="17" fill="${GINGER}"/>` +
      `<path d="M101 44 Q106 48 111 44 M117 44 Q122 48 127 44" fill="none" stroke="${NAVY}" stroke-width="2.6" stroke-linecap="round"/>` +
      `<path d="M111 51 L117 51 L114 54.5 Z" fill="${ROSE}" stroke="${ROSE}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<circle cx="102" cy="52" r="3.5" fill="${PINK}" opacity="0.8"/><circle cx="126" cy="52" r="3.5" fill="${PINK}" opacity="0.8"/>` +
      `<path d="M34 58 Q60 70 96 60" fill="none" stroke="${GINGER}" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M84 63 Q90 62 96 60" fill="none" stroke="${GINGER_DARK}" stroke-width="10" stroke-linecap="round"/>` +
      // Basket body and rim, drawn over the cat.
      `<path d="M20 60 L144 60 L134 92 Q82 100 30 92 Z" fill="${WICKER}" stroke="${WICKER_DARK}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M24 72 Q82 80 140 72 M27 83 Q82 91 137 83" fill="none" stroke="${WICKER_DARK}" stroke-width="2" opacity="0.7"/>` +
      `<path d="M44 62 L46 94 M62 62 L63 97 M82 62 L82 98 M102 62 L101 97 M120 62 L118 94" fill="none" stroke="${WICKER_DARK}" stroke-width="2" opacity="0.5"/>` +
      `<rect x="15" y="54" width="134" height="12" rx="6" fill="#dca06a" stroke="${WICKER_DARK}" stroke-width="2.5"/>` +
      `<path d="M22 58 L142 58" stroke="#f0c592" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>` +
      // Yarn ball with a loose thread, and a sleepy "z".
      `<path d="M150 80 Q140 95 120 96" fill="none" stroke="${ROSE}" stroke-width="2.5" stroke-linecap="round"/>` +
      `<circle cx="154" cy="80" r="13" fill="${PINK}" stroke="${ROSE}" stroke-width="2"/>` +
      `<path d="M143 74 Q154 69 166 76 M142 83 Q154 77 167 85 M150 68 Q144 80 152 92" fill="none" stroke="${ROSE}" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M134 12 L143 12 L134 21 L143 21 M147 2 L153 2 L147 8 L153 8" fill="none" stroke="#fff8ef" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
}

/** Puffy green cushion with a centre button and corner tassels. */
export function cushionSvg(): string {
  return propSvg(
    '0 0 150 90',
    `<ellipse cx="76" cy="84" rx="66" ry="6" fill="#4a1a04" opacity="0.35"/>` +
      `<path d="M14 16 Q75 4 136 14 Q128 44 138 78 Q75 90 12 80 Q22 46 14 16 Z" fill="#5cb883" stroke="#3a8a5d" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M24 22 Q75 12 124 20 Q118 36 122 46 Q70 32 26 44 Q30 32 24 22 Z" fill="#8fd9ab" opacity="0.7"/>` +
      `<path d="M75 46 L22 20 M75 46 L128 18 M75 46 L130 72 M75 46 L20 74" stroke="#3a8a5d" stroke-width="2" opacity="0.4"/>` +
      `<circle cx="75" cy="46" r="6" fill="#3a8a5d"/><circle cx="73.5" cy="44.5" r="2" fill="#bdebd0"/>` +
      `<g fill="#f4c95d" stroke="#b8862b" stroke-width="1.5">` +
      `<circle cx="13" cy="15" r="5"/><circle cx="137" cy="13" r="5"/><circle cx="139" cy="79" r="5"/><circle cx="11" cy="81" r="5"/>` +
      `</g>`,
  );
}

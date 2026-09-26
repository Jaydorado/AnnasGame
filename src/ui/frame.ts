/**
 * Landscape frame of the level screen. These numbers are the single source for both the CSS and the
 * board-fit math: `applyFrame` copies them into the custom properties `--strip-h` and `--booster-w`
 * that styles.css uses for the `.level` grid, and `boardArea` derives the board size from them.
 */

/** Bottom strip under the board that holds the stock and the discard, CSS px. */
export const STRIP_H = 88;
/** Right-edge column that holds the booster buttons, CSS px. */
export const BOOSTER_W = 76;

/** The board area's size for a viewport (safe-area insets excluded: the CSS pads them off first). */
export function boardArea(viewportW: number, viewportH: number): { w: number; h: number } {
  return { w: Math.max(0, viewportW - BOOSTER_W), h: Math.max(0, viewportH - STRIP_H) };
}

/** Sets the frame's CSS custom properties on the level screen element. */
export function applyFrame(el: HTMLElement): void {
  el.style.setProperty('--strip-h', `${STRIP_H}px`);
  el.style.setProperty('--booster-w', `${BOOSTER_W}px`);
}

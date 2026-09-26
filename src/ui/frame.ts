/**
 * Landscape frame of the level screen. These numbers are the single source for both the CSS and the
 * board-fit math: `applyFrame` copies them into the custom properties `--strip-h`, `--booster-w`,
 * `--hud-h`, `--hud-left-w` and `--hud-right-w` that styles.css uses for the `.level` grid and the HUD,
 * and `boardArea` / `hudBoxes` derive the board size and the HUD corners from them.
 */
import type { TopBox } from './boardFit';

/** Bottom strip under the board that holds the stock and the discard, CSS px. */
export const STRIP_H = 88;
/** Right-edge column that holds the booster buttons, CSS px. */
export const BOOSTER_W = 76;
/** Height of both HUD corner boxes, from the top edge, CSS px. */
export const HUD_H = 76;
/** Top-left HUD box (back button over the "Level N" pill), from the left edge, CSS px. */
export const HUD_LEFT_W = 76;
/** Top-right HUD box (coin pill over the streak pill), from the right edge over the booster column, CSS px. */
export const HUD_RIGHT_W = 104;

/** The board area's size for a viewport (safe-area insets excluded: the CSS pads them off first). */
export function boardArea(viewportW: number, viewportH: number): { w: number; h: number } {
  return { w: Math.max(0, viewportW - BOOSTER_W), h: Math.max(0, viewportH - STRIP_H) };
}

/** The HUD corner boxes in board-area coordinates; the right one starts inside the booster column. */
export function hudBoxes(areaW: number): readonly TopBox[] {
  return [
    { left: 0, right: HUD_LEFT_W, bottom: HUD_H },
    { left: areaW + BOOSTER_W - HUD_RIGHT_W, right: areaW + BOOSTER_W, bottom: HUD_H },
  ];
}

/** Sets the frame's CSS custom properties on the level screen element. */
export function applyFrame(el: HTMLElement): void {
  el.style.setProperty('--strip-h', `${STRIP_H}px`);
  el.style.setProperty('--booster-w', `${BOOSTER_W}px`);
  el.style.setProperty('--hud-h', `${HUD_H}px`);
  el.style.setProperty('--hud-left-w', `${HUD_LEFT_W}px`);
  el.style.setProperty('--hud-right-w', `${HUD_RIGHT_W}px`);
}

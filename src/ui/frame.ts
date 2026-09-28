/**
 * Landscape frame of the level screen. These numbers are the single source for both the CSS and the
 * board-fit math: `applyFrame` copies them into the custom properties `--strip-h`, `--pile-w`,
 * `--pile-h`, `--booster-w`, `--hud-*` and the pile spacing that styles.css uses for the `.level` grid,
 * the bottom strip and the HUD, and `levelFrame` / `hudBoxes` derive the board and pile sizes from them.
 */
import type { Layout } from '../core/layout';
import { CARD_ASPECT, fitBoard, type BoardFit, type TopBox } from './boardFit';

/** Right-edge column that holds the booster buttons, CSS px. */
export const BOOSTER_W = 76;
/** Height of both HUD corner boxes, from the top edge: one row of 44 px controls and 36 px pills, CSS px. */
export const HUD_H = 48;
/**
 * Top-left HUD box, from the left edge: the back button with the coin pill tucked beside it. A 5-digit
 * total ends at 122.9 px (measured, 15 px digits); more digits clip inside the pill. CSS px.
 */
export const HUD_LEFT_W = 124;
/**
 * Top-right HUD box, from the right edge over the booster column: "Level 25" beside a "×25" streak pill
 * starts 160.1 px from the edge (measured). CSS px.
 */
export const HUD_RIGHT_W = 162;

/** Stock and discard card width over the board's card width, while the board card meets roomyCardW... */
export const PILE_RATIO = 1.1;
/** ...and never less than a board card, where the 1.1x piles would push it under that floor. */
export const PILE_RATIO_MIN = 1;
/** The original T11 board-card floors, [frame width, px], by increasing width (before any relaxation). */
export const T11_FLOORS = [
  [640, 52],
  [800, 60],
] as const;

/**
 * Board-card floor the 1.1x piles must keep for a frame `w` px wide: the T11 floor, linear in the width
 * between the T11 points and held at the nearer one outside them (52 px up to 640, 60 px from 800).
 */
export function roomyCardW(w: number): number {
  const [[w0, px0], [w1, px1]] = T11_FLOORS;
  return px0 + ((px1 - px0) * Math.min(Math.max(w - w0, 0), w1 - w0)) / (w1 - w0);
}

/** Gap between the piles' bottom edge and the bottom of the frame (above the safe-area inset), CSS px. */
export const PILE_MARGIN_B = 8;
/** The stock's count badge rises this far above the piles; the strip keeps that room over them, CSS px. */
export const BADGE_RISE = 9;
/** The badge sticks out this far right of the stock, into the gap before the discard, CSS px. */
export const BADGE_OVERHANG = 10;
/** Most backs drawn in the stock's stacked edge... */
export const STACK_MAX = 10;
/** ...each this far left of the one above it, CSS px... */
export const STACK_STEP = 5;
/** ...so the edge takes this width left of the stock's top card, CSS px. */
export const STACK_W = (STACK_MAX - 1) * STACK_STEP;
/** Gap between the stock and the discard, CSS px. */
export const PILE_GAP = 16;
/**
 * Smallest board card width per test viewport [w, h, px] (T11). 800x360 is relaxed from 60 by 2 px:
 * the diamond's nine rows bind the height there, so its cards pay for the stock and discard being at
 * least a board card wide (58.3 px with 1.0x piles; 56.9 px with 1.1x ones).
 */
export const CARD_FLOORS = [
  [800, 360, 58],
  [640, 360, 52],
] as const;

export interface LevelFrame {
  /** The board area above the strip, left of the booster column, CSS px. */
  readonly areaW: number;
  readonly areaH: number;
  /** Bottom strip: badge room, the piles, the bottom margin, CSS px. */
  readonly stripH: number;
  /** Stock and discard card size, CSS px. */
  readonly pileW: number;
  readonly pileH: number;
  /** The pile ratio used: PILE_RATIO or PILE_RATIO_MIN. */
  readonly ratio: number;
  /** The board's fit in the area, clear of the HUD corners. */
  readonly board: BoardFit;
}

/**
 * The frame for a level's layout in a w x h frame (safe-area insets already excluded). The strip is the
 * shortest whole-px height whose piles are `ratio` board cards wide: a taller strip shrinks the board's
 * cards (or leaves them), so the board keeps the largest cards that still let the piles match them.
 * The piles fill the strip, so they come out up to a pixel wider than that.
 */
export function levelFrame(w: number, h: number, layout: Pick<Layout, 'width' | 'rows' | 'slots'>): LevelFrame {
  const areaW = Math.max(0, w - BOOSTER_W);
  const boxes = hudBoxes(areaW);
  const frameFor = (ratio: number): LevelFrame => {
    const room = BADGE_RISE + PILE_MARGIN_B;
    let lo = room; // strip heights below lo are too short for any pile
    let hi = Math.max(lo, Math.ceil(h)); // the whole height is always enough: no board, no board card
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const card = fitBoard(areaW, Math.max(0, h - mid), layout, boxes).cardW;
      if (mid >= room + CARD_ASPECT * ratio * card) hi = mid;
      else lo = mid + 1;
    }
    const areaH = Math.max(0, h - lo);
    const pileH = lo - room;
    return { areaW, areaH, stripH: lo, pileW: pileH / CARD_ASPECT, pileH, ratio, board: fitBoard(areaW, areaH, layout, boxes) };
  };
  const roomy = frameFor(PILE_RATIO);
  return roomy.board.cardW >= roomyCardW(w) ? roomy : frameFor(PILE_RATIO_MIN);
}

/** The HUD corner boxes in board-area coordinates; the right one starts inside the booster column. */
export function hudBoxes(areaW: number): readonly TopBox[] {
  return [
    { left: 0, right: HUD_LEFT_W, bottom: HUD_H },
    { left: areaW + BOOSTER_W - HUD_RIGHT_W, right: areaW + BOOSTER_W, bottom: HUD_H },
  ];
}

/** Sets the frame's CSS custom properties on the level screen element. */
export function applyFrame(el: HTMLElement, frame: LevelFrame): void {
  el.style.setProperty('--strip-h', `${frame.stripH}px`);
  el.style.setProperty('--pile-w', `${frame.pileW}px`);
  el.style.setProperty('--pile-h', `${frame.pileH}px`);
  el.style.setProperty('--pile-gap', `${PILE_GAP}px`);
  el.style.setProperty('--pile-margin-b', `${PILE_MARGIN_B}px`);
  el.style.setProperty('--badge-rise', `${BADGE_RISE}px`);
  el.style.setProperty('--stack-step', `${STACK_STEP}px`);
  el.style.setProperty('--stack-w', `${STACK_W}px`);
  el.style.setProperty('--booster-w', `${BOOSTER_W}px`);
  el.style.setProperty('--badge-overhang', `${BADGE_OVERHANG}px`);
  el.style.setProperty('--hud-h', `${HUD_H}px`);
  el.style.setProperty('--hud-left-w', `${HUD_LEFT_W}px`);
  el.style.setProperty('--hud-right-w', `${HUD_RIGHT_W}px`);
}

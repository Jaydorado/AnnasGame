/** Pure board-fit math: card size, table offset and row overlap for a board area. */
import type { Layout } from '../core/layout';

export const CARD_ASPECT = 1.4;
/** Vertical offset between rows, in card heights: half-card rows by default... */
export const MAX_ROW_STEP = 0.5;
/** ...overlapped down to a quarter card for tall layouts (ledger R20). */
export const MIN_ROW_STEP = 0.25;
/** Breathing room between the table and the board edges, CSS px. */
const PAD = 8;

export interface BoardFit {
  readonly cardW: number;
  readonly cardH: number;
  /** Table origin inside the board area, CSS px; slot left = offsetX + x * cardW. */
  readonly offsetX: number;
  /** Slot top = offsetY + row * rowStep * cardH. */
  readonly offsetY: number;
  readonly rowStep: number;
}

/** A box hanging from the board area's top edge (a HUD corner), in board-area CSS px. */
export interface TopBox {
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
}

type FitLayout = Pick<Layout, 'width' | 'rows' | 'slots'>;

/**
 * Largest cards that fit the area. Rows sit half a card apart while the width binds; when the height
 * binds instead, rows overlap more until the width binds or the step reaches MIN_ROW_STEP.
 * No slot may sit under a box in `avoid`: the table is pushed down below the boxes that its slots
 * reach, and the cards shrink only when the pushed table no longer fits.
 */
export function fitBoard(areaW: number, areaH: number, layout: FitLayout, avoid: readonly TopBox[] = []): BoardFit {
  const innerW = Math.max(0, areaW - 2 * PAD);
  const innerH = Math.max(0, areaH - 2 * PAD);
  const byWidth = innerW / layout.width;
  // Step at which the table is exactly byWidth wide and innerH tall: depth * aspect * byWidth = innerH.
  const wanted = layout.rows > 1 && byWidth > 0 ? (innerH / (CARD_ASPECT * byWidth) - 1) / (layout.rows - 1) : MAX_ROW_STEP;
  const rowStep = Math.min(MAX_ROW_STEP, Math.max(MIN_ROW_STEP, wanted));
  const depth = 1 + (layout.rows - 1) * rowStep; // table height in card heights
  let cardW = Math.min(byWidth, innerH / (depth * CARD_ASPECT));
  let offsetY = clearTop(areaW, areaH, layout, avoid, cardW, rowStep, depth);
  if (Number.isNaN(offsetY)) {
    // Smaller cards pull every slot toward the centre and leave more height under the boxes, so the
    // cards that clear them form an interval [0, best]: bisect for its end.
    let lo = 0;
    let hi = cardW;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (Number.isNaN(clearTop(areaW, areaH, layout, avoid, mid, rowStep, depth))) hi = mid;
      else lo = mid;
    }
    cardW = lo;
    offsetY = clearTop(areaW, areaH, layout, avoid, cardW, rowStep, depth);
  }
  return {
    cardW,
    cardH: CARD_ASPECT * cardW,
    offsetX: (areaW - layout.width * cardW) / 2,
    offsetY,
    rowStep,
  };
}

/**
 * Table top for this card size: centred, or pushed down just far enough that every slot reaching
 * under a box starts below it. NaN when the pushed table would run past the bottom padding.
 */
function clearTop(
  areaW: number,
  areaH: number,
  layout: FitLayout,
  avoid: readonly TopBox[],
  cardW: number,
  rowStep: number,
  depth: number,
): number {
  const cardH = CARD_ASPECT * cardW;
  const offsetX = (areaW - layout.width * cardW) / 2;
  const centred = (areaH - depth * cardH) / 2;
  let top = centred;
  for (const s of layout.slots) {
    const left = offsetX + s.x * cardW;
    for (const b of avoid) {
      if (left < b.right && b.left < left + cardW) top = Math.max(top, b.bottom - s.row * rowStep * cardH);
    }
  }
  return top === centred || top + depth * cardH <= areaH - PAD ? top : NaN;
}

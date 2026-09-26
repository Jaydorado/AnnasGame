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

/**
 * Largest cards that fit the area. Rows sit half a card apart while the width binds; when the height
 * binds instead, rows overlap more until the width binds or the step reaches MIN_ROW_STEP.
 */
export function fitBoard(areaW: number, areaH: number, layout: Pick<Layout, 'width' | 'rows'>): BoardFit {
  const innerW = Math.max(0, areaW - 2 * PAD);
  const innerH = Math.max(0, areaH - 2 * PAD);
  const byWidth = innerW / layout.width;
  // Step at which the table is exactly byWidth wide and innerH tall: depth * aspect * byWidth = innerH.
  const wanted = layout.rows > 1 && byWidth > 0 ? (innerH / (CARD_ASPECT * byWidth) - 1) / (layout.rows - 1) : MAX_ROW_STEP;
  const rowStep = Math.min(MAX_ROW_STEP, Math.max(MIN_ROW_STEP, wanted));
  const depth = 1 + (layout.rows - 1) * rowStep; // table height in card heights
  const cardW = Math.min(byWidth, innerH / (depth * CARD_ASPECT));
  const cardH = CARD_ASPECT * cardW;
  return {
    cardW,
    cardH,
    offsetX: (areaW - layout.width * cardW) / 2,
    offsetY: (areaH - depth * cardH) / 2,
    rowStep,
  };
}

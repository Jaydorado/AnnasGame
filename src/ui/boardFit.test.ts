import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../core/layouts';
import { CARD_ASPECT, MAX_ROW_STEP, MIN_ROW_STEP, fitBoard, type TopBox } from './boardFit';
import {
  BADGE_OVERHANG,
  BADGE_RISE,
  CARD_FLOORS,
  PILE_GAP,
  PILE_MARGIN_B,
  PILE_RATIO,
  PILE_RATIO_MIN,
  STACK_W,
  hudBoxes,
  levelFrame,
  roomyCardW,
} from './frame';

const EPS = 1e-9;
const layouts = Object.values(LAYOUTS);
const VIEWPORTS = [
  [800, 360],
  [640, 360],
  [915, 412],
] as const;

/** Every slot's rectangle stays inside the board area. */
function expectInside(areaW: number, areaH: number, layout: (typeof layouts)[number], avoid: readonly TopBox[] = []): void {
  const f = fitBoard(areaW, areaH, layout, avoid);
  expect(f.cardH).toBeCloseTo(f.cardW * CARD_ASPECT, 9);
  expect(f.rowStep).toBeGreaterThanOrEqual(MIN_ROW_STEP);
  expect(f.rowStep).toBeLessThanOrEqual(MAX_ROW_STEP);
  for (const s of layout.slots) {
    const left = f.offsetX + s.x * f.cardW;
    const top = f.offsetY + s.row * f.rowStep * f.cardH;
    expect(left).toBeGreaterThanOrEqual(-EPS);
    expect(top).toBeGreaterThanOrEqual(-EPS);
    expect(left + f.cardW).toBeLessThanOrEqual(areaW + EPS);
    expect(top + f.cardH).toBeLessThanOrEqual(areaH + EPS);
  }
}

describe('fitBoard in the landscape frame', () => {
  it.each(CARD_FLOORS)('at %ix%i every layout gets cards at least %i px wide, inside the board area', (vw, vh, floor) => {
    for (const layout of layouts) {
      const { areaW, areaH } = levelFrame(vw, vh, layout);
      expect(fitBoard(areaW, areaH, layout).cardW, layout.id).toBeGreaterThanOrEqual(floor);
      expectInside(areaW, areaH, layout);
    }
  });

  it('keeps the table inside the area at 915x412 too', () => {
    for (const layout of layouts) {
      const { areaW, areaH } = levelFrame(915, 412, layout);
      expectInside(areaW, areaH, layout);
    }
  });

  it('keeps half-card rows when the width binds and only overlaps rows more when height binds', () => {
    const wideArea = levelFrame(640, 360, LAYOUTS.threePeaks); // 10 cards wide, 4 rows
    expect(fitBoard(wideArea.areaW, wideArea.areaH, LAYOUTS.threePeaks).rowStep).toBe(MAX_ROW_STEP);
    const tallArea = levelFrame(640, 360, LAYOUTS.diamond); // 5 cards wide, 9 rows
    expect(fitBoard(tallArea.areaW, tallArea.areaH, LAYOUTS.diamond).rowStep).toBeLessThan(MAX_ROW_STEP);
  });

  it('never goes below the row-step floor, even in a very flat area', () => {
    const f = fitBoard(2000, 200, LAYOUTS.diamond);
    expect(f.rowStep).toBe(MIN_ROW_STEP);
    expectInside(2000, 200, LAYOUTS.diamond);
  });
});

describe('fitBoard around the HUD corners', () => {
  it.each(VIEWPORTS)('at %ix%i no slot of any layout sits under the HUD corner boxes', (vw, vh) => {
    const hits: string[] = [];
    for (const layout of layouts) {
      const { areaW, areaH, board: f } = levelFrame(vw, vh, layout);
      const boxes = hudBoxes(areaW);
      expect(f).toEqual(fitBoard(areaW, areaH, layout, boxes));
      layout.slots.forEach((s, i) => {
        const left = f.offsetX + s.x * f.cardW;
        const top = f.offsetY + s.row * f.rowStep * f.cardH;
        boxes.forEach((b, k) => {
          if (left < b.right - EPS && b.left < left + f.cardW - EPS && top < b.bottom - EPS) {
            hits.push(`${layout.id} slot ${i} under ${k === 0 ? 'left' : 'right'} box`);
          }
        });
      });
      expectInside(areaW, areaH, layout, boxes);
    }
    expect(hits).toEqual([]);
  });

  it.each(CARD_FLOORS)('at %ix%i the card-width floor of %i px still holds with the HUD cleared', (vw, vh, floor) => {
    for (const layout of layouts) {
      expect(levelFrame(vw, vh, layout).board.cardW, layout.id).toBeGreaterThanOrEqual(floor);
    }
  });

  // threePeaks is not listed: its left peak sits under the top-left corner, where the coin pill now
  // sits beside the back button, so it trades a few px of card width for clearing it (still >= the floors).
  it.each(VIEWPORTS)('at %ix%i layouts with empty corners keep their full size', (vw, vh) => {
    for (const layout of [LAYOUTS.pyramid, LAYOUTS.diamond]) {
      const { areaW, areaH, board } = levelFrame(vw, vh, layout);
      expect(board, layout.id).toEqual(fitBoard(areaW, areaH, layout));
    }
  });
});

describe('levelFrame: stock and discard in the bottom strip', () => {
  it.each(VIEWPORTS)('at %ix%i the piles are at least a board card wide, 1.1x while the viewport floor holds', (vw, vh) => {
    for (const layout of layouts) {
      const f = levelFrame(vw, vh, layout);
      const card = f.board.cardW;
      expect(f.pileW, layout.id).toBeGreaterThanOrEqual(card);
      expect(f.pileW, layout.id).toBeGreaterThanOrEqual(f.ratio * card - EPS);
      expect(f.pileH).toBeCloseTo(f.pileW * CARD_ASPECT, 9);
      if (f.ratio === PILE_RATIO) expect(card, layout.id).toBeGreaterThanOrEqual(roomyCardW(vw));
    }
  });

  // Only diamond at 800x360 drops to 1.0x: with 1.1x piles its cards would be 56.9 px, under the 60 px floor.
  it.each([
    [800, 360, ['diamond']],
    [640, 360, []],
    [915, 412, []],
  ] as const)('at %ix%i the layouts on 1.0x piles are %j; every other layout gets 1.1x', (vw, vh, narrow) => {
    for (const layout of layouts) {
      const want = (narrow as readonly string[]).includes(layout.id) ? PILE_RATIO_MIN : PILE_RATIO;
      expect(levelFrame(vw, vh, layout).ratio, layout.id).toBe(want);
    }
  });

  it('at 640x360 threePeaks keeps its width-capped cards under 1.1x piles', () => {
    const f = levelFrame(640, 360, LAYOUTS.threePeaks);
    expect(f.board.cardW).toBeCloseTo(fitBoard(f.areaW, 10_000, LAYOUTS.threePeaks).cardW, 9);
    expect(f.pileW).toBeGreaterThanOrEqual(PILE_RATIO * f.board.cardW);
  });

  it.each(VIEWPORTS)('at %ix%i the piles, stacked edge and badge sit fully on screen, 8 px above the bottom', (vw, vh) => {
    for (const layout of layouts) {
      const f = levelFrame(vw, vh, layout);
      expect(f.areaH + f.stripH).toBeCloseTo(vh, 9);
      // Vertical: the badge rises into the strip's top BADGE_RISE, the piles sit on the bottom margin.
      const pileBottom = f.areaH + BADGE_RISE + f.pileH;
      expect(vh - pileBottom, layout.id).toBeGreaterThanOrEqual(PILE_MARGIN_B - EPS);
      // Horizontal: stacked edge + stock + gap + discard, centred under the board area.
      const rowW = STACK_W + f.pileW + PILE_GAP + f.pileW;
      const left = (f.areaW - rowW) / 2;
      const badgeRight = left + STACK_W + f.pileW + BADGE_OVERHANG;
      expect(left, layout.id).toBeGreaterThanOrEqual(0);
      expect(left + rowW, layout.id).toBeLessThanOrEqual(f.areaW);
      expect(badgeRight, layout.id).toBeLessThanOrEqual(left + rowW - f.pileW);
    }
  });
});

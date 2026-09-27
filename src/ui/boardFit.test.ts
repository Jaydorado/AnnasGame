import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../core/layouts';
import { CARD_ASPECT, MAX_ROW_STEP, MIN_ROW_STEP, fitBoard, type TopBox } from './boardFit';
import { boardArea, hudBoxes } from './frame';

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
  it.each([
    [800, 360, 60],
    [640, 360, 52],
  ])('at %ix%i every layout gets cards at least %i px wide, inside the board area', (vw, vh, floor) => {
    const { w, h } = boardArea(vw, vh);
    for (const layout of layouts) {
      expect(fitBoard(w, h, layout).cardW, layout.id).toBeGreaterThanOrEqual(floor);
      expectInside(w, h, layout);
    }
  });

  it('keeps the table inside the area at 915x412 too', () => {
    const { w, h } = boardArea(915, 412);
    for (const layout of layouts) expectInside(w, h, layout);
  });

  it('keeps half-card rows when the width binds and only overlaps rows more when height binds', () => {
    const { w, h } = boardArea(800, 360);
    const wide = fitBoard(w, h, LAYOUTS.threePeaks); // 10 cards wide, 4 rows
    expect(wide.rowStep).toBe(MAX_ROW_STEP);
    const tall = fitBoard(w, h, LAYOUTS.diamond); // 5 cards wide, 9 rows
    expect(tall.rowStep).toBeLessThan(MAX_ROW_STEP);
  });

  it('never goes below the row-step floor, even in a very flat area', () => {
    const f = fitBoard(2000, 200, LAYOUTS.diamond);
    expect(f.rowStep).toBe(MIN_ROW_STEP);
    expectInside(2000, 200, LAYOUTS.diamond);
  });
});

describe('fitBoard around the HUD corners', () => {
  it.each(VIEWPORTS)('at %ix%i no slot of any layout sits under the HUD corner boxes', (vw, vh) => {
    const { w, h } = boardArea(vw, vh);
    const boxes = hudBoxes(w);
    const hits: string[] = [];
    for (const layout of layouts) {
      const f = fitBoard(w, h, layout, boxes);
      layout.slots.forEach((s, i) => {
        const left = f.offsetX + s.x * f.cardW;
        const top = f.offsetY + s.row * f.rowStep * f.cardH;
        boxes.forEach((b, k) => {
          if (left < b.right - EPS && b.left < left + f.cardW - EPS && top < b.bottom - EPS) {
            hits.push(`${layout.id} slot ${i} under ${k === 0 ? 'left' : 'right'} box`);
          }
        });
      });
      expectInside(w, h, layout, boxes);
    }
    expect(hits).toEqual([]);
  });

  it.each([
    [800, 360, 60],
    [640, 360, 52],
  ])('at %ix%i the card-width floor of %i px still holds with the HUD cleared', (vw, vh, floor) => {
    const { w, h } = boardArea(vw, vh);
    for (const layout of layouts) {
      expect(fitBoard(w, h, layout, hudBoxes(w)).cardW, layout.id).toBeGreaterThanOrEqual(floor);
    }
  });

  // threePeaks is not listed: its left peak sits under the top-left corner, where the coin pill now
  // sits beside the back button, so it trades a few px of card width for clearing it (still >= the floors).
  it.each(VIEWPORTS)('at %ix%i layouts with empty corners keep their full size', (vw, vh) => {
    const { w, h } = boardArea(vw, vh);
    for (const layout of [LAYOUTS.pyramid, LAYOUTS.diamond]) {
      expect(fitBoard(w, h, layout, hudBoxes(w)), layout.id).toEqual(fitBoard(w, h, layout));
    }
  });
});

import { buildLayout, type Layout, type LayoutId } from './layout';

const range = (start: number, count: number): number[] => Array.from({ length: count }, (_, i) => start + i);
/** Centered row of n cards in a layout max cards wide. */
const centered = (n: number, max: number): number[] => range((max - n) / 2, n);

export const LAYOUTS: Record<LayoutId, Layout> = {
  threePeaks: buildLayout('threePeaks', [[1.5, 4.5, 7.5], [1, 2, 4, 5, 7, 8], range(0.5, 9), range(0, 10)]),
  pyramid: buildLayout('pyramid', [1, 2, 3, 4, 5, 6].map((n) => centered(n, 6))),
  diamond: buildLayout('diamond', [1, 2, 3, 4, 5, 4, 3, 2, 1].map((n) => centered(n, 5))),
  twinPeaks: buildLayout('twinPeaks', [[1.5, 5.5], [1, 2, 5, 6], [0.5, 1.5, 2.5, 4.5, 5.5, 6.5], range(0, 8)]),
  wall: buildLayout('wall', [range(0, 6), range(0.5, 5), range(0, 6), range(0.5, 5), range(0, 6)]),
};

import type { LayoutId } from '../src/core/layout';
import { solveLevel } from '../src/core/solver';

// [layoutId, stockSize, minBest, maxBest] per level, in map order.
const PLAN: [LayoutId, number, number, number][] = [
  ['threePeaks', 24, 8, 14], ['threePeaks', 24, 8, 14], ['threePeaks', 24, 8, 14], ['threePeaks', 24, 8, 14], ['threePeaks', 24, 8, 14],
  ['pyramid', 22, 7, 12], ['pyramid', 22, 7, 12], ['pyramid', 22, 7, 12],
  ['threePeaks', 22, 5, 9], ['threePeaks', 22, 5, 9], ['threePeaks', 22, 5, 9],
  ['twinPeaks', 20, 5, 9], ['twinPeaks', 20, 5, 9], ['twinPeaks', 20, 5, 9],
  ['diamond', 20, 4, 7], ['diamond', 20, 4, 7], ['diamond', 20, 4, 7],
  ['wall', 20, 3, 6], ['wall', 20, 3, 6], ['wall', 20, 3, 6],
  ['threePeaks', 18, 2, 4], ['threePeaks', 18, 2, 4], ['threePeaks', 18, 2, 4],
  ['wall', 16, 2, 4],
  ['diamond', 16, 2, 4],
];
const MAX_TRIES = 20_000;

const lines = PLAN.map(([layoutId, stockSize, minBest, maxBest], i) => {
  const id = i + 1;
  for (let k = 0; k < MAX_TRIES; k++) {
    const seed = id * 100_000 + k;
    const { winnable, bestStockLeft: best } = solveLevel({ id, layoutId, seed, stockSize, star2: 1, star3: 2 });
    if (winnable && best >= minBest && best <= maxBest) {
      const star3 = Math.max(2, Math.ceil(best * 0.6));
      const star2 = Math.max(1, Math.floor(star3 / 2));
      return `  { id: ${id}, layoutId: '${layoutId}', seed: ${seed}, stockSize: ${stockSize}, star2: ${star2}, star3: ${star3} }, // best ${best}`;
    }
  }
  throw new Error(`Level ${id} (${layoutId}, stock ${stockSize}): no seed in ${MAX_TRIES} tries for best in [${minBest}, ${maxBest}]`);
});

console.log(lines.join('\n'));

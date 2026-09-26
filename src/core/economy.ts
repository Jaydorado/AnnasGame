import type { LevelDef } from './level';

export const ECON = {
  startCoins: 100,
  perCard: 1,
  winBonus: 20,
  perStockLeft: 2,
  threeStarBonus: 25,
  undoCost: 5,
  wildCost: 25,
  addFiveCost: 30,
  addFiveCount: 5,
} as const;

export function streakBonus(streak: number): number {
  return streak > 0 && streak % 5 === 0 ? streak : 0;
}

export function starsFor(level: Pick<LevelDef, 'star2' | 'star3'>, stockLeft: number): 1 | 2 | 3 {
  if (stockLeft >= level.star3) return 3;
  if (stockLeft >= level.star2) return 2;
  return 1;
}

import type { LayoutId } from './layout';

export interface LevelDef {
  readonly id: number;
  readonly layoutId: LayoutId;
  readonly seed: number;
  readonly stockSize: number; // includes the card flipped to the discard at deal
  readonly star2: number;
  readonly star3: number;
}

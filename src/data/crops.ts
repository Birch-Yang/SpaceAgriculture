import type { CropKind } from "../game/state/types.ts";

export const CROPS: Record<CropKind, { cycle: number; foodValue: number; sensitivity: number; lightNeed: number }> = {
  lettuce: { cycle: 2, foodValue: 1, sensitivity: 1.2, lightNeed: 1 },
  potato: { cycle: 3, foodValue: 1.3, sensitivity: 0.8, lightNeed: 1 },
  wheat: { cycle: 4, foodValue: 1.5, sensitivity: 1, lightNeed: 1.2 },
};

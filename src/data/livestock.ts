import type { AnimalKind } from "../game/state/types.ts";

export const LIVESTOCK: Record<AnimalKind, { cycle: number; feed: number; water: number; yieldFactor: number }> = {
  chicken: { cycle: 2, feed: 1, water: 1, yieldFactor: 1 },
  pig: { cycle: 3, feed: 2, water: 2, yieldFactor: 1.4 },
  cow: { cycle: 4, feed: 4, water: 4, yieldFactor: 2 },
};

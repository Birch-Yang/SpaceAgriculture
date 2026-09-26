import type { GameMode } from "../game/state/types.ts";

export type Difficulty = { budget: number; starting: { power: number; water: number; oxygen: number; food: number; temperature: number }; baseline: { power: number; water: number; oxygen: number; food: number }; ap: number; cropTarget: number; meatTarget: number; hazardPressure: number; buildBudget: number };

/** Budgets used by version 1 transcripts already stored in the mission archive. */
export const LEGACY_INITIAL_BUDGET = { challenge: 145, progressive: 175 } as const;

export const DIFFICULTY: Record<GameMode, [Difficulty, Difficulty, Difficulty]> = {
  challenge: Array(3).fill({ budget: 220, starting: { power: 24, water: 40, oxygen: 40, food: 26, temperature: 20 }, baseline: { power: 2, water: 2, oxygen: 2, food: 2 }, ap: 4, cropTarget: 16, meatTarget: 10, hazardPressure: 100, buildBudget: 0 }) as [Difficulty, Difficulty, Difficulty],
  progressive: [
    { budget: 220, starting: { power: 34, water: 55, oxygen: 55, food: 36, temperature: 20 }, baseline: { power: 2, water: 2, oxygen: 2, food: 2 }, ap: 5, cropTarget: 12, meatTarget: 7, hazardPressure: 35, buildBudget: 0 },
    { budget: 0, starting: { power: 0, water: 0, oxygen: 0, food: 0, temperature: 20 }, baseline: { power: 2, water: 2, oxygen: 2, food: 2 }, ap: 4, cropTarget: 30, meatTarget: 18, hazardPressure: 65, buildBudget: 35 },
    { budget: 0, starting: { power: 0, water: 0, oxygen: 0, food: 0, temperature: 20 }, baseline: { power: 2, water: 2, oxygen: 2, food: 2 }, ap: 4, cropTarget: 50, meatTarget: 30, hazardPressure: 100, buildBudget: 35 },
  ],
};

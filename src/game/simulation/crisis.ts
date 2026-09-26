import type { GameState } from "../state/types.ts";

export function criticalCondition(state: GameState): string | undefined {
  for (const resource of ["oxygen", "water", "food", "power"] as const) {
    if (state.resources[resource] <= 0) return `${resource} depleted`;
  }
  if (state.resources.temperature < 5 || state.resources.temperature > 35) return "temperature outside survival band";
  return undefined;
}

import { MODULE_BY_ID } from "../../data/modules.ts";
import { communicationsAvailable, connectedToHabitat } from "../../data/systems.ts";
import type { GameState } from "./types.ts";

export function selectPlacedModules(state: GameState) {
  return state.modules.map((module) => ({ ...module, definition: MODULE_BY_ID.get(module.moduleId)! }));
}

export function selectCommunicationsAvailable(state: GameState): boolean {
  return communicationsAvailable(state);
}

/** Advisory only: topology checks, not a prediction of survival or production. */
export function selectBuildReadinessWarnings(state: GameState): string[] {
  const warnings: string[] = [];
  const modules = selectPlacedModules(state);
  if (!modules.some(item => item.definition.category === "greenhouse")) warnings.push("No greenhouse: crop production targets cannot be met.");
  if (!modules.some(item => item.definition.category === "livestock")) warnings.push("No livestock module: meat production targets cannot be met.");
  const disconnected = modules.filter(item => !connectedToHabitat(state, item.id));
  if (disconnected.length) warnings.push(`${disconnected.length} module(s) are disconnected from the habitat. Connect utility corridors before starting.`);
  for (const resource of ["power", "water", "oxygen"] as const) {
    const field = `${resource}Supply` as "powerSupply" | "waterSupply" | "oxygenSupply";
    if (!modules.some(item => (item.definition.flow[field] ?? 0) > 0 && connectedToHabitat(state, item.id))) {
      warnings.push(`No connected ${resource} supply. Reserves may run out during the mission.`);
    }
  }
  return warnings;
}

export function selectTurnLabel(state: GameState): string {
  return state.turn > 10 ? `EMERGENCY RECOVERY · TURN ${state.turn}` : `TURN ${state.turn}/10`;
}

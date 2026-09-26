import { MODULE_BY_ID } from "../../data/modules.ts";
import type { GameState } from "./types.ts";

export function selectPlacedModules(state: GameState) {
  return state.modules.map((module) => ({ ...module, definition: MODULE_BY_ID.get(module.moduleId)! }));
}

export function selectCommunicationsAvailable(state: GameState): boolean {
  return state.activeHazard?.type !== "communications";
}

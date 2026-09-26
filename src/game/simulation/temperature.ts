import { MODULE_BY_ID } from "../../data/modules.ts";
import type { GameState } from "../state/types.ts";

export function resolveTemperature(state: GameState): number {
  const heat = state.modules.reduce((sum, module) => sum + MODULE_BY_ID.get(module.moduleId)!.heatOutput * module.integrity, 0);
  const thermal = state.modules.reduce((sum, module) => sum + (module.allocation?.thermal ?? 0) * 3 * module.integrity, 0);
  const hazard = state.activeHazard?.type === "temperature" ? -8 * state.activeHazard.severity : 0;
  return Math.round((state.resources.temperature + (20 - state.resources.temperature) * 0.22 + heat * 0.12 + thermal - 1.5 + hazard) * 10) / 10;
}

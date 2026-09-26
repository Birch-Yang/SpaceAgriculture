import { MODULE_BY_ID } from "../../data/modules.ts";
import { moduleDistance, SYSTEMS } from "../../data/systems.ts";
import type { GameState } from "../state/types.ts";
import type { NetworkResult } from "./utilityGraph.ts";

export function resolveTemperature(state: GameState, network: NetworkResult): number {
  const habitat = state.modules.find((module) => MODULE_BY_ID.get(module.moduleId)?.category === "habitat");
  const heat = state.modules.reduce((sum, module) => {
    const def = MODULE_BY_ID.get(module.moduleId)!;
    const powered = def.flow.powerDemand ? (network.delivery[module.id]?.power ?? 0) : 1;
    return sum + def.heatOutput * module.integrity * powered;
  }, 0);
  const thermal = state.modules.reduce((sum, module) => {
    const distanceFactor = habitat ? Math.max(0.3, 1 - moduleDistance(module, habitat) * SYSTEMS.thermalDistanceFalloff) : 0;
    return sum + (module.allocation?.thermal ?? 0) * 3 * module.integrity * (network.delivery[module.id]?.power ?? 0) * distanceFactor;
  }, 0);
  const hazard = state.activeHazard?.type === "temperature" ? -8 * state.activeHazard.severity : 0;
  return Math.round((state.resources.temperature + (20 - state.resources.temperature) * 0.22 + heat * 0.12 + thermal - 1.5 + hazard) * 10) / 10;
}

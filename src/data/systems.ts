import { MODULE_BY_ID } from "./modules.ts";
import type { GameState, PlacedModule, ResourceKey } from "../game/state/types.ts";

export const SYSTEMS = {
  baseStorage: { power: 40, water: 65, oxygen: 65, food: 55 },
  greenhouseWaterNearDistance: 2,
  greenhouseWaterUseFactor: 0.9,
  greenhouseWaterYieldFactor: 1.08,
  livestockRecycleNearDistance: 2,
  greenhouseRecycleYieldFactor: 1.05,
  backupPowerPerUtility: 8,
  communicationsBackupThreshold: 0.4,
  communicationsTowerBoost: 0.2,
  thermalDistanceFalloff: 0.15,
  moduleMoveCost: 2,
  corridorRemovalCost: 1,
  recreationApBonus: 1,
} as const;

function footprint(module: PlacedModule): { w: number; h: number } {
  const def = MODULE_BY_ID.get(module.moduleId)!;
  return module.rotation === 90 || module.rotation === 270
    ? { w: def.footprint.h, h: def.footprint.w } : def.footprint;
}

export function moduleDistance(a: PlacedModule, b: PlacedModule): number {
  const af = footprint(a); const bf = footprint(b);
  const dx = Math.max(0, b.x - (a.x + af.w - 1), a.x - (b.x + bf.w - 1));
  const dy = Math.max(0, b.y - (a.y + af.h - 1), a.y - (b.y + bf.h - 1));
  return dx + dy;
}

export function connectedToHabitat(state: GameState, moduleId: string): boolean {
  const cores = state.modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "habitat").map((module) => module.id);
  const seen = new Set(cores); const pending = [...cores];
  while (pending.length) {
    const current = pending.pop()!;
    if (current === moduleId) return true;
    for (const edge of state.utilityEdges) {
      if (edge.integrity <= 0.15) continue;
      const next = edge.from === current ? edge.to : edge.to === current ? edge.from : undefined;
      if (next && !seen.has(next)) { seen.add(next); pending.push(next); }
    }
  }
  return false;
}

export function resourceCapacity(state: GameState, resource: ResourceKey): number {
  return state.modules.reduce<number>((sum, module) => {
    if (!connectedToHabitat(state, module.id)) return sum;
    return sum + (MODULE_BY_ID.get(module.moduleId)?.flow.storage?.[resource] ?? 0) * module.integrity;
  }, SYSTEMS.baseStorage[resource]);
}

export function greenhouseWaterBonus(state: GameState, greenhouse: PlacedModule): boolean {
  return connectedToHabitat(state, greenhouse.id) && state.modules.some((module) => MODULE_BY_ID.get(module.moduleId)?.category === "water"
    && module.integrity > 0.15 && connectedToHabitat(state, module.id)
    && moduleDistance(greenhouse, module) <= SYSTEMS.greenhouseWaterNearDistance);
}

export function greenhouseRecyclingBonus(state: GameState, greenhouse: PlacedModule): boolean {
  return connectedToHabitat(state, greenhouse.id) && state.modules.some((module) => MODULE_BY_ID.get(module.moduleId)?.category === "livestock"
    && module.integrity > 0.15 && connectedToHabitat(state, module.id)
    && state.livestock.some((animal) => animal.moduleId === module.id && animal.animal)
    && moduleDistance(greenhouse, module) <= SYSTEMS.livestockRecycleNearDistance);
}

export function communicationsAvailable(state: GameState): boolean {
  if (state.activeHazard?.type !== "communications") return true;
  const tower = state.modules.some((module) => MODULE_BY_ID.get(module.moduleId)?.category === "communications"
    && module.integrity > 0.5 && connectedToHabitat(state, module.id));
  return state.resources.power > 0 && state.modules.some((module) =>
    MODULE_BY_ID.get(module.moduleId)?.category === "utility"
    && module.integrity > 0.5
    && (module.allocation?.commsBackup ?? 0) + (tower ? SYSTEMS.communicationsTowerBoost : 0) >= SYSTEMS.communicationsBackupThreshold
    && connectedToHabitat(state, module.id));
}

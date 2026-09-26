import { MODULE_BY_ID } from "../../data/modules.ts";
import { SYSTEMS } from "../../data/systems.ts";
import type { GameState, ResourceKey, UtilityEdge } from "../state/types.ts";

export type NetworkResult = {
  delivery: Record<string, Partial<Record<ResourceKey, number>>>;
  net: Record<ResourceKey, number>;
  bottlenecks: string[];
};

type FlowField = "powerSupply" | "waterSupply" | "oxygenSupply" | "powerDemand" | "waterDemand" | "oxygenDemand";
const resources: Array<[ResourceKey, FlowField, FlowField]> = [
  ["power", "powerSupply", "powerDemand"],
  ["water", "waterSupply", "waterDemand"],
  ["oxygen", "oxygenSupply", "oxygenDemand"],
];

function bestPath(state: GameState, from: string, to: string, capacity: Map<string, number>): UtilityEdge[] | undefined {
  if (from === to) return [];
  const pending: Array<{ id: string; cost: number; path: UtilityEdge[] }> = [{ id: from, cost: 0, path: [] }];
  const visited = new Set<string>();
  while (pending.length) {
    pending.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
    const current = pending.shift()!;
    if (current.id === to) return current.path;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    for (const edge of state.utilityEdges) {
      if (edge.integrity <= 0.15 || (capacity.get(edge.id) ?? 0) <= 0) continue;
      const next = edge.from === current.id ? edge.to : edge.to === current.id ? edge.from : undefined;
      if (next && !visited.has(next)) pending.push({ id: next, cost: current.cost + edge.length / edge.integrity, path: [...current.path, edge] });
    }
  }
  return undefined;
}

function pathEfficiency(path: UtilityEdge[]): number {
  const distance = path.reduce((sum, edge) => sum + edge.length, 0);
  const damage = path.reduce((sum, edge) => sum + 1 - edge.integrity, 0);
  return Math.max(0.55, 1 - distance * 0.015 - damage * 0.1);
}

function pathCapacity(path: UtilityEdge[], capacity: Map<string, number>): number {
  return path.length ? Math.min(...path.map((edge) => capacity.get(edge.id) ?? 0)) : Infinity;
}

function useCapacity(path: UtilityEdge[], capacity: Map<string, number>, amount: number): void {
  for (const edge of path) capacity.set(edge.id, Math.max(0, (capacity.get(edge.id) ?? 0) - amount));
}

export function resolveUtilityGraph(state: GameState): NetworkResult {
  const delivery: NetworkResult["delivery"] = Object.fromEntries(state.modules.map((module) => [module.id, {}]));
  const net: NetworkResult["net"] = { power: 0, water: 0, oxygen: 0, food: 0 };
  const bottlenecks: string[] = [];
  const cores = state.modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "habitat").map((module) => module.id);
  if (!cores.length) return { delivery, net, bottlenecks: ["No habitat core"] };

  for (const [resource, supplyField, demandField] of resources) {
    const collectionCapacity = new Map(state.utilityEdges.map((edge) => [edge.id, edge.capacity * edge.integrity]));
    const deliveryCapacity = new Map(collectionCapacity);
    let collected = 0;
    for (const module of state.modules) {
      const def = MODULE_BY_ID.get(module.moduleId);
      if (!def) continue;
      const powered = resource === "power" ? 1 : (delivery[module.id]?.power ?? 0);
      const backup = resource === "power" && def.category === "utility"
        ? (module.allocation?.backupPower ?? 0) * SYSTEMS.backupPowerPerUtility : 0;
      let remaining = ((def.flow[supplyField] ?? 0) + backup) * module.integrity * powered;
      while (remaining > 0.0001) {
        const routes = cores.map((core) => bestPath(state, module.id, core, collectionCapacity)).filter((path): path is UtilityEdge[] => path !== undefined);
        routes.sort((a, b) => a.reduce((n, edge) => n + edge.length, 0) - b.reduce((n, edge) => n + edge.length, 0));
        const path = routes[0];
        if (!path) break;
        const gross = Math.min(remaining, pathCapacity(path, collectionCapacity));
        if (gross <= 0) break;
        collected += gross * pathEfficiency(path);
        remaining -= gross;
        useCapacity(path, collectionCapacity, gross);
      }
      if (remaining > 0.05 && ((def.flow[supplyField] ?? 0) + backup) > 0) bottlenecks.push(`${module.id}: ${resource} supply cannot reach habitat`);
    }

    let available = Math.max(0, state.resources[resource]) + collected;
    let spent = 0;
    const consumers = state.modules.filter((module) => (MODULE_BY_ID.get(module.moduleId)?.flow[demandField] ?? 0) > 0)
      .sort((a, b) => (cores.includes(a.id) ? -1 : 0) - (cores.includes(b.id) ? -1 : 0) || a.id.localeCompare(b.id));
    for (const module of consumers) {
      const demand = (MODULE_BY_ID.get(module.moduleId)!.flow[demandField] ?? 0) * module.integrity;
      let received = 0;
      while (received < demand - 0.0001 && available > 0.0001) {
        const routes = cores.map((core) => bestPath(state, core, module.id, deliveryCapacity)).filter((path): path is UtilityEdge[] => path !== undefined);
        routes.sort((a, b) => a.reduce((n, edge) => n + edge.length, 0) - b.reduce((n, edge) => n + edge.length, 0));
        const path = routes[0];
        if (!path) break;
        const efficiency = pathEfficiency(path);
        const gross = Math.min(available, pathCapacity(path, deliveryCapacity), (demand - received) / efficiency);
        if (gross <= 0) break;
        received += gross * efficiency;
        available -= gross;
        spent += gross;
        useCapacity(path, deliveryCapacity, gross);
      }
      delivery[module.id][resource] = demand > 0 ? Math.min(1, received / demand) : 1;
      if (received < demand * 0.95) bottlenecks.push(`${module.id}: ${resource} ${Math.round(received / demand * 100)}% delivered`);
    }
    net[resource] = collected - spent;
  }
  return { delivery, net, bottlenecks };
}

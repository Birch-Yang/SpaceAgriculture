import { MODULE_BY_ID } from "../../data/modules.ts";
import type { GameState, ResourceKey, UtilityEdge } from "../state/types.ts";

export type NetworkResult = {
  delivery: Record<string, Partial<Record<ResourceKey, number>>>;
  net: Record<ResourceKey, number>;
  bottlenecks: string[];
};

function bestPath(state: GameState, source: string, target: string, capacity: Map<string, number>): UtilityEdge[] | undefined {
  if (source === target) return [];
  const frontier: Array<{ id: string; cost: number; path: UtilityEdge[] }> = [{ id: source, cost: 0, path: [] }];
  const visited = new Set<string>();
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift()!;
    if (current.id === target) return current.path;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    for (const edge of state.utilityEdges) {
      if (edge.integrity <= 0.15 || (capacity.get(edge.id) ?? 0) <= 0) continue;
      const next = edge.from === current.id ? edge.to : edge.to === current.id ? edge.from : undefined;
      if (!next || visited.has(next)) continue;
      frontier.push({ id: next, cost: current.cost + edge.length / Math.max(edge.integrity, 0.2), path: [...current.path, edge] });
    }
  }
  return undefined;
}

export function resolveUtilityGraph(state: GameState): NetworkResult {
  const delivery: NetworkResult["delivery"] = Object.fromEntries(state.modules.map((module) => [module.id, {}]));
  const net: NetworkResult["net"] = { power: 0, water: 0, oxygen: 0, food: 0 };
  const bottlenecks: string[] = [];
  const fields: Array<[ResourceKey, "powerSupply" | "waterSupply" | "oxygenSupply", "powerDemand" | "waterDemand" | "oxygenDemand"]> = [
    ["power", "powerSupply", "powerDemand"], ["water", "waterSupply", "waterDemand"], ["oxygen", "oxygenSupply", "oxygenDemand"],
  ];

  for (const [resource, supplyField, demandField] of fields) {
    const capacity = new Map(state.utilityEdges.map((edge) => [edge.id, edge.capacity * edge.integrity]));
    const sources = state.modules.map((module) => {
      const def = MODULE_BY_ID.get(module.moduleId)!;
      const powerFactor = resource === "power" ? 1 : (delivery[module.id]?.power ?? 0);
      return { id: module.id, available: (def.flow[supplyField] ?? 0) * module.integrity * powerFactor };
    }).filter((source) => source.available > 0);
    const consumers = state.modules.map((module) => ({ id: module.id, demand: MODULE_BY_ID.get(module.moduleId)!.flow[demandField] ?? 0 })).filter((consumer) => consumer.demand > 0);
    net[resource] = sources.reduce((sum, source) => sum + source.available, 0) - consumers.reduce((sum, consumer) => sum + consumer.demand, 0);

    for (const consumer of consumers) {
      let received = 0;
      while (received < consumer.demand) {
        const candidates = sources.map((source) => ({ source, path: bestPath(state, source.id, consumer.id, capacity) }))
          .filter((item): item is { source: typeof sources[number]; path: UtilityEdge[] } => !!item.path && item.source.available > 0)
          .sort((a, b) => a.path.reduce((sum, edge) => sum + edge.length, 0) - b.path.reduce((sum, edge) => sum + edge.length, 0));
        const route = candidates[0];
        if (!route) break;
        const bottleneck = route.path.length ? Math.min(...route.path.map((edge) => capacity.get(edge.id) ?? 0)) : Infinity;
        const gross = Math.min(route.source.available, bottleneck, consumer.demand - received);
        if (gross <= 0) break;
        const distance = route.path.reduce((sum, edge) => sum + edge.length, 0);
        const damage = route.path.reduce((sum, edge) => sum + (1 - edge.integrity), 0);
        const efficiency = Math.max(0.55, 1 - distance * 0.015 - damage * 0.1);
        received += gross * efficiency;
        route.source.available -= gross;
        for (const edge of route.path) capacity.set(edge.id, (capacity.get(edge.id) ?? 0) - gross);
      }
      delivery[consumer.id][resource] = Math.min(1, received / consumer.demand);
      if (received < consumer.demand * 0.95) bottlenecks.push(`${consumer.id}: ${resource} ${Math.round(received / consumer.demand * 100)}% delivered`);
    }
  }
  return { delivery, net, bottlenecks };
}

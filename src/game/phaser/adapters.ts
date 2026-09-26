import { MAP_SIZE } from "../state/reducer.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import type { Cell, GameState, PlacedModule, Rotation, UtilityEdge } from "../state/types.ts";

export const ISO_TILE_WIDTH = 56;
export const ISO_TILE_HEIGHT = 28;

export function footprint(moduleId: string, rotation: Rotation): { w: number; h: number } {
  const definition = MODULE_BY_ID.get(moduleId);
  if (!definition) return { w: 1, h: 1 };
  return rotation === 90 || rotation === 270
    ? { w: definition.footprint.h, h: definition.footprint.w }
    : definition.footprint;
}

export function occupiedCells(module: PlacedModule): Cell[] {
  const size = footprint(module.moduleId, module.rotation);
  return Array.from({ length: size.w * size.h }, (_, i) => ({
    x: module.x + i % size.w,
    y: module.y + Math.floor(i / size.w),
  }));
}

export type PlacementPreview = { valid: boolean; reason?: string };

/** A visual hint only; applyBuildAction remains the authoritative validator. */
export function getPlacementPreview(
  state: GameState,
  moduleId: string,
  x: number,
  y: number,
  rotation: Rotation,
): PlacementPreview {
  const definition = MODULE_BY_ID.get(moduleId);
  if (!definition) return { valid: false, reason: "Unknown module" };
  if (state.phase !== "design" && state.phase !== "intermission") return { valid: false, reason: "Base is locked" };
  if (state.budget < definition.cost) return { valid: false, reason: "Insufficient budget" };
  const candidate = occupiedCells({ id: "preview", moduleId, x, y, rotation, integrity: 1 });
  if (candidate.some((cell) => cell.x < 0 || cell.y < 0 || cell.x >= MAP_SIZE.width || cell.y >= MAP_SIZE.height)) {
    return { valid: false, reason: "Outside map" };
  }
  const occupied = new Set(state.modules.flatMap(occupiedCells).map(({ x: cellX, y: cellY }) => `${cellX},${cellY}`));
  for (const edge of state.utilityEdges) {
    for (const cell of edge.cells) occupied.add(`${cell.x},${cell.y}`);
  }
  if (candidate.some(({ x: cellX, y: cellY }) => occupied.has(`${cellX},${cellY}`))) return { valid: false, reason: "Blocked" };
  return { valid: true };
}

export type CorridorVisual = { edge: UtilityEdge; status: "normal" | "active" | "bottleneck" | "damaged" | "disconnected" };

export function getDisconnectedModuleIds(state: GameState): Set<string> {
  const roots = state.modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "habitat").map((module) => module.id);
  const links = new Map<string, string[]>();
  for (const edge of state.utilityEdges) {
    if (edge.integrity <= 0.15) continue;
    links.set(edge.from, [...(links.get(edge.from) ?? []), edge.to]);
    links.set(edge.to, [...(links.get(edge.to) ?? []), edge.from]);
  }
  const reachable = new Set(roots);
  const pending = [...roots];
  while (pending.length) {
    const current = pending.pop()!;
    for (const next of links.get(current) ?? []) {
      if (reachable.has(next)) continue;
      reachable.add(next);
      pending.push(next);
    }
  }
  return new Set(state.modules.filter((module) => !reachable.has(module.id)).map((module) => module.id));
}

/**
 * Translate simulation-owned network facts into visual states. This adapter
 * never computes delivery, flow, capacity, or resource outcomes.
 */
export function renderUtilityNetwork(state: GameState): CorridorVisual[] {
  const disconnectedModules = getDisconnectedModuleIds(state);
  const active = state.phase === "operation";
  return state.utilityEdges.map((edge) => {
    const mentionsEndpoint = state.lastTurn?.warnings.some((warning) => warning.includes(edge.from) || warning.includes(edge.to)) ?? false;
    const status = edge.integrity <= 0.15
      ? "damaged"
      : edge.integrity < 0.75
        ? "damaged"
        : disconnectedModules.has(edge.from) && disconnectedModules.has(edge.to)
          ? "disconnected"
        : mentionsEndpoint
          ? "bottleneck"
          : active
            ? "active"
            : "normal";
    return { edge, status };
  });
}

export function hasCorridorAt(state: GameState, x: number, y: number): boolean {
  return state.utilityEdges.some((edge) => edge.cells.some((cell) => cell.x === x && cell.y === y));
}

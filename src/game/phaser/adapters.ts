import { corridorTopology, reachableCorridorNodes } from "../simulation/corridorTopology.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import type { Cell, GameState, ModuleDefinition, Rotation, UtilityEdge } from "../state/types.ts";
import { MAP_SIZE } from "../state/reducer.ts";
import { rotatedFootprint } from "./isometric.ts";

export type UtilityVisualStatus = "normal" | "connected" | "damaged" | "bottleneck" | "disconnected";
export type UtilityVisualEdge = { edge: UtilityEdge; status: UtilityVisualStatus };

function edgesConnectedToHabitat(state: GameState): Set<string> {
  const topology = corridorTopology(state);
  const reachable = reachableCorridorNodes(state, topology);
  return new Set(state.utilityEdges.filter(edge =>
    topology.edgeNodes.get(edge.id)?.every(id => reachable.has(id))).map(edge => edge.id));
}

// Renderer-only projection of authoritative state. It never estimates resource flow.
export function renderUtilityNetwork(state: GameState): UtilityVisualEdge[] {
  const connectedEdges = edgesConnectedToHabitat(state);
  const bottleneckModules = new Set((state.lastTurn?.warnings ?? [])
    .filter((warning) => warning.includes("% delivered"))
    .map((warning) => warning.slice(0, warning.indexOf(":")).trim().toLowerCase()));
  return state.utilityEdges.map((edge) => ({
    edge,
    status: edge.integrity < 0.5
        ? "damaged"
        : state.phase === "operation" && !connectedEdges.has(edge.id)
          ? "disconnected"
          : bottleneckModules.has(edge.from.toLowerCase()) || bottleneckModules.has(edge.to.toLowerCase())
          ? "bottleneck"
          : state.phase === "operation" ? "connected" : "normal",
  }));
}

export function occupiedModuleCells(state: GameState): Set<string> {
  const cells = new Set<string>();
  for (const module of state.modules) {
    const definition = MODULE_BY_ID.get(module.moduleId);
    if (!definition) continue;
    const { w, h } = rotatedFootprint(definition.footprint, module.rotation);
    for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) cells.add(`${module.x + dx},${module.y + dy}`);
  }
  return cells;
}

// Fast visual preview only. applyBuildAction remains the final authority.
export function previewModule(state: GameState, definition: ModuleDefinition, x: number, y: number, rotation: Rotation): { valid: boolean; reason?: string; cells: Cell[] } {
  const { w, h } = rotatedFootprint(definition.footprint, rotation);
  const cells: Cell[] = [];
  for (let dx = 0; dx < w; dx++) for (let dy = 0; dy < h; dy++) cells.push({ x: x + dx, y: y + dy });
  if (state.phase !== "design" && state.phase !== "intermission") return { valid: false, reason: "Build mode is locked", cells };
  if (cells.some((cell) => cell.x < 0 || cell.y < 0 || cell.x >= MAP_SIZE.width || cell.y >= MAP_SIZE.height)) return { valid: false, reason: "Outside map", cells };
  const occupied = occupiedModuleCells(state);
  for (const edge of state.utilityEdges) for (const cell of edge.cells) occupied.add(`${cell.x},${cell.y}`);
  if (cells.some((cell) => occupied.has(`${cell.x},${cell.y}`))) return { valid: false, reason: "Cell occupied", cells };
  if (state.budget < definition.cost) return { valid: false, reason: "Insufficient budget", cells };
  return { valid: true, cells };
}

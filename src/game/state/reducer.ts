import { DIFFICULTY, LEGACY_INITIAL_BUDGET } from "../../data/difficulty.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import { SYSTEMS } from "../../data/systems.ts";
import { forecastForTurn } from "../simulation/hazards.ts";
import type { Cell, GameMode, GameState, PlacedModule, PlayerAction } from "./types.ts";

export const MAP_SIZE = { width: 14, height: 14 } as const;
const corridorCellCost = 1;

export function createInitialState(runId: string, nickname: string, mode: GameMode, rulesetVersion: 1 | 2 | 3 = 2): GameState {
  if (!runId.trim() || !nickname.trim()) throw new Error("Run ID and nickname are required");
  const difficulty = DIFFICULTY[mode][0];
  return {
    runId, nickname: nickname.trim().slice(0, 32), mode, rulesetVersion, phase: "design", level: 1, turn: 1,
    budget: rulesetVersion === 1 ? LEGACY_INITIAL_BUDGET[mode] : difficulty.budget,
    ap: 0, resources: { ...difficulty.starting },
    production: { cropCumulative: 0, meatCumulative: 0, researchAvailable: 0, cropResidue: 0, feedReserve: 0, nutrients: 0 }, modules: [], utilityEdges: [],
    crops: [], livestock: [],
    forecast: forecastForTurn({ runId, mode, level: 1, turn: 1 }),
    history: [], turnRecords: [], nextId: 1,
  };
}

function footprint(module: PlacedModule): { w: number; h: number } {
  const def = MODULE_BY_ID.get(module.moduleId);
  if (!def) throw new Error(`Unknown module: ${module.moduleId}`);
  return module.rotation === 90 || module.rotation === 270
    ? { w: def.footprint.h, h: def.footprint.w }
    : def.footprint;
}

function occupiedCells(module: PlacedModule): Cell[] {
  const { w, h } = footprint(module);
  return Array.from({ length: w * h }, (_, i) => ({ x: module.x + i % w, y: module.y + Math.floor(i / w) }));
}

function touches(module: PlacedModule, cell: Cell): boolean {
  return occupiedCells(module).some(({ x, y }) => Math.abs(x - cell.x) + Math.abs(y - cell.y) === 1);
}

/** Exact material delta for removal; shared with the presentation. */
export function getBuildRemovalRefund(state: GameState, targetId: string): number {
  const initialBuild = state.phase === "design" && state.level === 1 && state.turn === 1;
  const module = state.modules.find(item => item.id === targetId);
  if (module) {
    const cost = MODULE_BY_ID.get(module.moduleId)!.cost;
    const attachedCost = state.utilityEdges.filter(edge => edge.from === targetId || edge.to === targetId)
      .reduce((sum, edge) => sum + edge.cells.length * corridorCellCost, 0);
    return initialBuild ? cost + attachedCost : Math.floor(cost / 2);
  }
  const edge = state.utilityEdges.find(item => item.id === targetId);
  return edge ? (initialBuild ? edge.cells.length * corridorCellCost : -SYSTEMS.corridorRemovalCost) : 0;
}

export function applyBuildAction(state: GameState, action: PlayerAction): { state: GameState; error?: string } {
  if (state.phase !== "design" && state.phase !== "intermission") return { state, error: "Base layout is locked during operation" };
  if (action.type === "PLACE_MODULE") {
    if (action.rotation !== 0) return { state, error: "Modules use a fixed orientation" };
    const def = MODULE_BY_ID.get(action.moduleId);
    if (!def) return { state, error: "Unknown module" };
    const candidate: PlacedModule = { id: `module-${state.nextId}`, moduleId: def.id, x: action.x, y: action.y, rotation: action.rotation, integrity: 1,
      ...(def.category === "utility" ? { allocation: { thermal: 0.5, backupPower: 0.3, commsBackup: 0.2 } } : {}) };
    const cells = occupiedCells(candidate);
    if (!Number.isInteger(action.x) || !Number.isInteger(action.y) || cells.some(({ x, y }) => x < 0 || y < 0 || x >= MAP_SIZE.width || y >= MAP_SIZE.height)) return { state, error: "Module is outside the map" };
    const blocked = new Set(state.modules.flatMap(occupiedCells).map(({ x, y }) => `${x},${y}`));
    for (const edge of state.utilityEdges) for (const cell of edge.cells) blocked.add(`${cell.x},${cell.y}`);
    if (cells.some(({ x, y }) => blocked.has(`${x},${y}`))) return { state, error: "Placement overlaps another object" };
    if (state.budget < def.cost) return { state, error: "Insufficient construction budget" };
    return { state: {
      ...state, budget: state.budget - def.cost, nextId: state.nextId + 1,
      modules: [...state.modules, candidate],
      crops: def.category === "greenhouse" ? [...state.crops, ...Array.from({ length: def.capacity }, (_, slotIndex) => ({ moduleId: candidate.id, slotIndex, crop: state.rulesetVersion >= 3 ? null : slotIndex === 0 ? "lettuce" as const : null, growth: 0, ready: false, wateredThisCycle: false, water: "medium" as const, light: "medium" as const, temperature: "medium" as const, ...(state.rulesetVersion >= 3 ? { moisture: 60, health: 100, wetTurns: 0 } : {}) }))] : state.crops,
      livestock: def.category === "livestock" ? [...state.livestock, ...Array.from({ length: def.capacity }, (_, slotIndex) => ({ moduleId: candidate.id, slotIndex, animal: slotIndex === 0 ? "chicken" as const : null, growth: 0, feed: "normal" as const, fedThisCycle: false, feedMinigameModifier: 0, ...(state.rulesetVersion >= 3 ? { satiety: 70, cleanliness: 90, health: 100 } : {}) }))] : state.livestock,
    } };
  }
  if (action.type === "REMOVE_MODULE") {
    const placed = state.modules.find((item) => item.id === action.placedModuleId);
    if (!placed) return { state, error: "Unknown placed module" };
    return { state: {
      ...state, budget: state.budget + getBuildRemovalRefund(state, placed.id),
      modules: state.modules.filter((item) => item.id !== placed.id),
      utilityEdges: state.utilityEdges.filter((edge) => edge.from !== placed.id && edge.to !== placed.id),
      crops: state.crops.filter((crop) => crop.moduleId !== placed.id),
      livestock: state.livestock.filter((animal) => animal.moduleId !== placed.id),
    } };
  }
  if (action.type === "MOVE_MODULE") {
    const placed = state.modules.find((item) => item.id === action.placedModuleId);
    if (!placed) return { state, error: "Unknown placed module" };
    if (state.utilityEdges.some((edge) => edge.from === placed.id || edge.to === placed.id))
      return { state, error: "Remove attached corridors before moving a module" };
    if (action.x === placed.x && action.y === placed.y) return { state, error: "Module is already at that location" };
    if (!Number.isInteger(action.x) || !Number.isInteger(action.y)) return { state, error: "Invalid module location" };
    const moved = { ...placed, x: action.x, y: action.y };
    const cells = occupiedCells(moved);
    if (cells.some(({ x, y }) => x < 0 || y < 0 || x >= MAP_SIZE.width || y >= MAP_SIZE.height))
      return { state, error: "Module is outside the map" };
    const blocked = new Set(state.modules.filter((module) => module.id !== placed.id).flatMap(occupiedCells).map(({ x, y }) => `${x},${y}`));
    for (const edge of state.utilityEdges) for (const cell of edge.cells) blocked.add(`${cell.x},${cell.y}`);
    if (cells.some(({ x, y }) => blocked.has(`${x},${y}`))) return { state, error: "Placement overlaps another object" };
    if (state.budget < SYSTEMS.moduleMoveCost) return { state, error: "Insufficient construction budget" };
    return { state: { ...state, budget: state.budget - SYSTEMS.moduleMoveCost,
      modules: state.modules.map((module) => module.id === placed.id ? moved : module) } };
  }
  if (action.type === "REMOVE_CORRIDOR") {
    if (!state.utilityEdges.some((edge) => edge.id === action.edgeId)) return { state, error: "Unknown utility corridor" };
    const refund = getBuildRemovalRefund(state, action.edgeId);
    if (state.budget + refund < 0) return { state, error: "Insufficient construction budget" };
    return { state: { ...state, budget: state.budget + refund,
      utilityEdges: state.utilityEdges.filter((edge) => edge.id !== action.edgeId) } };
  }
  if (action.type === "PLACE_CORRIDOR") {
    const cells = action.cells;
    if (cells.length === 0 || cells.some((cell) => !Number.isInteger(cell.x) || !Number.isInteger(cell.y) || cell.x < 0 || cell.y < 0 || cell.x >= MAP_SIZE.width || cell.y >= MAP_SIZE.height)) return { state, error: "Invalid corridor cells" };
    if (new Set(cells.map((cell) => `${cell.x},${cell.y}`)).size !== cells.length) return { state, error: "Corridor cannot repeat a cell" };
    if (cells.some((cell, i) => i > 0 && Math.abs(cell.x - cells[i - 1].x) + Math.abs(cell.y - cells[i - 1].y) !== 1)) return { state, error: "Corridor cells must form a continuous path" };
    const blocked = new Set(state.modules.flatMap(occupiedCells).map(({ x, y }) => `${x},${y}`));
    for (const edge of state.utilityEdges) for (const cell of edge.cells) blocked.add(`${cell.x},${cell.y}`);
    if (cells.some(({ x, y }) => blocked.has(`${x},${y}`))) return { state, error: "Corridor overlaps another object" };
    const from = state.modules.find((module) => touches(module, cells[0]));
    const to = state.modules.find((module) => module.id !== from?.id && touches(module, cells[cells.length - 1]));
    if (!from || !to) return { state, error: "Corridor endpoints must touch two different modules" };
    if (state.budget < cells.length * corridorCellCost) return { state, error: "Insufficient construction budget" };
    return { state: { ...state, budget: state.budget - cells.length * corridorCellCost, nextId: state.nextId + 1,
      utilityEdges: [...state.utilityEdges, { id: `edge-${state.nextId}`, from: from.id, to: to.id, cells: cells.map((cell) => ({ ...cell })), length: cells.length, capacity: 20, integrity: 1 }] } };
  }
  return { state, error: "Action is not available during construction" };
}

export function startOperation(state: GameState): GameState {
  if (state.phase !== "design" && state.phase !== "intermission") throw new Error("Not in a build phase");
  if (!state.modules.some((module) => MODULE_BY_ID.get(module.moduleId)?.category === "habitat")) throw new Error("A habitat core is required");
  return { ...state, phase: "operation" };
}

export function advanceLevel(state: GameState): GameState {
  if (state.mode !== "progressive" || state.phase !== "intermission" || state.level >= 3) throw new Error("No next level available");
  const nextLevel = (state.level + 1) as 2 | 3;
  return { ...state, level: nextLevel, turn: 1, budget: state.budget + DIFFICULTY.progressive[nextLevel - 1].buildBudget,
    forecast: forecastForTurn({ runId: state.runId, mode: state.mode, level: nextLevel, turn: 1 }), activeHazard: undefined, lastTurn: undefined };
}

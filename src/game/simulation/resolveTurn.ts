import { DIFFICULTY } from "../../data/difficulty.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import type { GameEvent, GameState, PlayerAction, ResourceState, TurnResult } from "../state/types.ts";
import { criticalCondition } from "./crisis.ts";
import { growCrops, harvestCrop } from "./crops.ts";
import { hazardForTurn } from "./hazards.ts";
import { growLivestock } from "./livestock.ts";
import { resolveTemperature } from "./temperature.ts";
import { resolveUtilityGraph } from "./utilityGraph.ts";
import { isCropId } from '../../data/cropCatalog.ts';

function apRecovery(state: GameState): number {
  const baseline = DIFFICULTY[state.mode][state.level - 1].ap;
  const reserve = state.resources.food / 60;
  const factor = reserve > 0.7 ? 1 : reserve > 0.4 ? 0.9 : reserve > 0.2 ? 0.75 : 0.6;
  return Math.max(1, Math.floor(baseline * factor));
}

function actionCost(action: PlayerAction): number {
  if (action.type === "REPAIR") return 2;
  if (action.type === "END_TURN") return 0;
  return 1;
}

function applyOperationAction(state: GameState, action: PlayerAction): string | undefined {
  const cost = actionCost(action);
  if (cost > state.ap) return "Insufficient action points";
  if (action.type === "END_TURN") return undefined;
  if (action.type === "SET_CROP_PARAMS") {
    const plot = state.crops.find((item) => item.moduleId === action.moduleId);
    if (!plot) return "Crop plot not found";
    plot.water = action.water; plot.light = action.light; plot.temperature = action.temperature;
  } else if (action.type === "SET_LIVESTOCK_PARAMS") {
    const animal = state.livestock.find((item) => item.moduleId === action.moduleId);
    if (!animal) return "Livestock module not found";
    animal.feed = action.feed;
  } else if (action.type === "REALLOCATE_UTILITY") {
    const module = state.modules.find((item) => item.id === action.moduleId);
    if (!module || MODULE_BY_ID.get(module.moduleId)?.category !== "utility") return "Utility module not found";
    const values = Object.values(action.allocation);
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1) || Math.abs(values.reduce((a, b) => a + b, 0) - 1) > 0.001) return "Allocation must sum to one";
    if (module.allocation && Math.max(...values.map((value, index) => Math.abs(value - Object.values(module.allocation!)[index]))) > 0.25) return "Operation allows only small reallocations";
    module.allocation = { ...action.allocation };
  } else if (action.type === "REPAIR") {
    const target = state.modules.find((item) => item.id === action.targetId) ?? state.utilityEdges.find((item) => item.id === action.targetId);
    if (!target) return "Repair target not found";
    target.integrity = Math.min(1, target.integrity + 0.25);
  } else if (action.type === "PLANT_CROP") {
    if (!isCropId(action.crop)) return 'Unknown or retired crop ID';
    const plot = state.crops.find((item) => item.moduleId === action.moduleId);
    if (!plot) return "Crop plot not found";
    plot.crop = action.crop; plot.growth = 0; plot.ready = false;
  } else if (action.type === "HARVEST_CROP") {
    const plot = state.crops.find((item) => item.moduleId === action.moduleId);
    if (!plot?.ready) return "Crop is not ready";
  } else if (action.type === "SET_ANIMAL") {
    const animal = state.livestock.find((item) => item.moduleId === action.moduleId);
    if (!animal) return "Livestock module not found";
    animal.animal = action.animal; animal.growth = 0;
  } else {
    return "Base layout is locked during operation";
  }
  state.ap -= cost;
  return undefined;
}

function applyHazard(state: GameState, warnings: string[]): void {
  const hazard = state.activeHazard;
  if (!hazard) return;
  const shelter = state.modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "shelter").reduce((sum, module) => sum + module.integrity, 0);
  const protection = Math.min(0.6, shelter * 0.2);
  if (hazard.type === "power") state.resources.power = Math.max(0, state.resources.power - 8 * hazard.severity);
  if (hazard.type === "radiation") state.resources.oxygen = Math.max(0, state.resources.oxygen - 4 * hazard.severity * (1 - protection));
  if (hazard.type === "micrometeoroid" && state.modules.length > 0) {
    const index = hazard.turn % state.modules.length;
    state.modules[index].integrity = Math.max(0, state.modules[index].integrity - 0.35 * hazard.severity * (1 - protection));
  }
  if (hazard.type === "communications") warnings.push("Mission Control communication is unavailable this turn");
  warnings.push(`Hazard: ${hazard.type}`);
}

export function resolveTurn(state: GameState, actions: PlayerAction[], rngSeed: string): TurnResult {
  if (state.crops.some(plot => !isCropId(plot.crop))) throw new Error('This run contains a retired crop ID. Start a new run or explicitly migrate it.');
  if (state.phase !== "operation") throw new Error("Turn resolution requires operation phase");
  if (!rngSeed) throw new Error("A deterministic RNG seed is required");
  const next: GameState = structuredClone(state);
  const before = { ...next.resources };
  const warnings: string[] = [];
  const acceptedActions: PlayerAction[] = [];
  const rejectedActions: string[] = [];
  const turn = next.turn;

  // 1. Reveal hazard; 2. restore AP; 3. apply strategic actions.
  next.activeHazard = hazardForTurn(next, rngSeed);
  next.ap = apRecovery(next);
  for (const action of actions) {
    const error = applyOperationAction(next, action);
    if (error) rejectedActions.push(`${action.type}: ${error}`);
    else acceptedActions.push(action);
  }

  // 4. Minigame modifier is neutral until Developer A supplies a validated result.
  // 5. Network and 6. temperature.
  const network = resolveUtilityGraph(next);
  warnings.push(...network.bottlenecks);
  next.resources.temperature = resolveTemperature(next);

  // 7. Crop growth and harvest; 8. livestock.
  let cropYield = 0;
  let cropFood = 0;
  for (const action of acceptedActions) {
    if (action.type !== "HARVEST_CROP") continue;
    const harvest = harvestCrop(next, action.moduleId, network);
    cropYield += harvest.yield;
    cropFood += harvest.food;
    next.production.researchCumulative = (next.production.researchCumulative ?? 0) + harvest.research;
    if (harvest.research) next.history.push({ turn, type: 'RESEARCH', message: `Collected ${harvest.research} research sample(s)`, amount: harvest.research });
    const plot = next.crops.find((item) => item.moduleId === action.moduleId)!;
    plot.growth = 0; plot.ready = false;
  }
  const crops = growCrops(next, network);
  next.crops = crops.crops;
  const livestock = growLivestock(next, network);
  next.livestock = livestock.livestock;
  next.production.cropCumulative += cropYield;
  next.production.meatCumulative += livestock.meatYield;

  // 9. Baseline consumption; 10. hazard consequences.
  const baseline = DIFFICULTY[next.mode][next.level - 1].baseline;
  next.resources.power = Math.max(0, next.resources.power + network.net.power - baseline.power - crops.powerUsed);
  next.resources.water = Math.max(0, next.resources.water + network.net.water - baseline.water - crops.waterUsed - livestock.waterUsed);
  next.resources.oxygen = Math.max(0, next.resources.oxygen + network.net.oxygen - baseline.oxygen);
  next.resources.food = Math.max(0, next.resources.food + cropFood + livestock.meatYield - baseline.food - livestock.feedUsed);
  applyHazard(next, warnings);
  for (const key of ["power", "water", "oxygen", "food"] as const) next.resources[key] = Math.round(next.resources[key] * 10) / 10;

  // 11. One complete recovery turn after a crisis trigger.
  const critical = criticalCondition(next);
  if (next.crisis && turn >= next.crisis.recoveryTurn) {
    if (critical) { next.phase = "complete"; next.passed = false; next.failureReason = `Crisis not recovered: ${critical}`; }
    else { warnings.push("Crisis recovered"); next.crisis = undefined; }
  } else if (!next.crisis && critical) {
    next.crisis = { trigger: critical, recoveryTurn: turn + 1 };
    warnings.push(`Crisis: ${critical}; one turn to recover`);
  }

  if (next.phase === "operation" && turn >= 10 && !next.crisis) {
    const { cropTarget, meatTarget } = DIFFICULTY[next.mode][next.level - 1];
    const passed = next.production.cropCumulative >= cropTarget && next.production.meatCumulative >= meatTarget;
    next.passed = passed;
    if (!passed) next.failureReason = `Production threshold missed (${cropTarget} crop, ${meatTarget} meat)`;
    next.phase = passed && next.mode === "progressive" && next.level < 3 ? "intermission" : "complete";
  }

  // 12. Turn summary; 13. immutable history append.
  const resourceDelta: ResourceState = {
    power: next.resources.power - before.power, water: next.resources.water - before.water,
    oxygen: next.resources.oxygen - before.oxygen, food: next.resources.food - before.food,
    temperature: next.resources.temperature - before.temperature,
  };
  const summary = { turn, hazard: next.activeHazard, resourceDelta, cropYield, meatYield: livestock.meatYield, warnings };
  const events: GameEvent[] = [
    ...(next.activeHazard ? [{ turn, type: "HAZARD", message: next.activeHazard.type }] : []),
    ...(cropYield ? [{ turn, type: "CROP_YIELD", message: "Crops harvested", amount: cropYield }] : []),
    ...(livestock.meatYield ? [{ turn, type: "MEAT_YIELD", message: "Livestock output", amount: livestock.meatYield }] : []),
    ...(next.crisis?.recoveryTurn === turn + 1 ? [{ turn, type: "CRISIS", message: next.crisis.trigger }] : []),
  ];
  next.history = [...next.history, ...events];
  next.lastTurn = summary;
  if (next.phase === "operation") next.turn = turn + 1;
  return { state: next, summary, acceptedActions, rejectedActions };
}

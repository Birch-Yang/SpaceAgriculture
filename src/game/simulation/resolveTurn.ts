import { DIFFICULTY } from "../../data/difficulty.ts";
import { AGRICULTURE, boundedModifier } from "../../data/agriculture.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import { communicationsAvailable, connectedToHabitat, resourceCapacity, shelterProtection, SYSTEMS } from "../../data/systems.ts";
import type { CropPlotState, GameEvent, GameState, LivestockState, PlayerAction, ResourceState, TurnResult } from "../state/types.ts";
import { criticalCondition } from "./crisis.ts";
import { growCrops, harvestCrop } from "./crops.ts";
import { forecastForTurn, hazardForTurn, hazardSchedule, seedForLevel } from "./hazards.ts";
import { growLivestock } from "./livestock.ts";
import { resolveTemperature } from "./temperature.ts";
import { resolveUtilityGraph } from "./utilityGraph.ts";
import { isCropId } from '../../data/cropCatalog.ts';

export function maxActionPoints(state: GameState): number {
  const baseline = DIFFICULTY[state.mode][state.level - 1].ap;
  const recreation = state.resources.power > 0 && state.modules.some((module) => MODULE_BY_ID.get(module.moduleId)?.category === "recreation"
    && module.integrity > 0.5 && connectedToHabitat(state, module.id));
  return baseline + (recreation ? SYSTEMS.recreationApBonus : 0);
}

export function apRecovery(state: GameState): number {
  const baseline = DIFFICULTY[state.mode][state.level - 1].ap;
  const reserve = state.resources.food / 60;
  const factor = reserve > 0.7 ? 1 : reserve > 0.4 ? 0.9 : reserve > 0.2 ? 0.75 : 0.6;
  return Math.max(1, Math.floor(baseline * factor)) + maxActionPoints(state) - baseline;
}

function actionCost(action: PlayerAction): number {
  if (action.type === "REPAIR") return 2;
  if (action.type === "END_TURN") return 0;
  return 1;
}

type PendingHarvest = { plot: CropPlotState; modifier: number };

function validSlot(state: GameState, moduleId: string, slotIndex: number, category: "greenhouse" | "livestock"): boolean {
  const module = state.modules.find((item) => item.id === moduleId);
  const def = module && MODULE_BY_ID.get(module.moduleId);
  return !!def && def.category === category && Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < def.capacity;
}

function cropSlot(state: GameState, moduleId: string, slotIndex: number): CropPlotState | undefined {
  return validSlot(state, moduleId, slotIndex, "greenhouse")
    ? state.crops.find((item) => item.moduleId === moduleId && item.slotIndex === slotIndex) : undefined;
}

function livestockSlot(state: GameState, moduleId: string, slotIndex: number): LivestockState | undefined {
  return validSlot(state, moduleId, slotIndex, "livestock")
    ? state.livestock.find((item) => item.moduleId === moduleId && item.slotIndex === slotIndex) : undefined;
}

function invalidModifier(value: number | undefined): boolean {
  return value !== undefined && !Number.isFinite(value);
}

function applyOperationAction(state: GameState, action: PlayerAction, pendingHarvests: PendingHarvest[]): string | undefined {
  const cost = actionCost(action);
  if (cost > state.ap) return "Insufficient action points";
  if (action.type === "END_TURN") return undefined;
  if (state.rulesetVersion < 3 && ["PRUNE_PLOT", "CLEAN_STALL", "ALLOCATE_RESIDUE", "USE_RESEARCH"].includes(action.type)) return "Action requires agriculture ruleset 3";
  if (action.type === "SET_CROP_PARAMS") {
    const plot = cropSlot(state, action.moduleId, action.slotIndex ?? 0);
    if (!plot) return "Crop plot not found";
    plot.water = action.water; plot.light = action.light; plot.temperature = action.temperature;
  } else if (action.type === "SET_LIVESTOCK_PARAMS") {
    const animal = livestockSlot(state, action.moduleId, action.slotIndex ?? 0);
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
    if (invalidModifier(action.minigameModifier)) return "Invalid minigame modifier";
    target.integrity = Math.min(1, target.integrity + AGRICULTURE.repairIntegrityGain * (1 + boundedModifier(action.minigameModifier)));
  } else if (action.type === "PLANT_CROP") {
    if (!isCropId(action.crop)) return "Unknown or retired crop ID";
    const plot = cropSlot(state, action.moduleId, action.slotIndex ?? 0);
    if (!plot) return "Crop plot not found";
    plot.crop = action.crop; plot.growth = 0; plot.ready = false; plot.wateredThisCycle = false;
    if (state.rulesetVersion >= 3) { plot.moisture = Math.max(plot.moisture ?? 60, 45); plot.health = 100; plot.wetTurns = 0; }
  } else if (action.type === "HARVEST_CROP") {
    const plot = cropSlot(state, action.moduleId, action.slotIndex ?? 0);
    if (!plot) return "Crop plot not found";
    if (!plot.crop || !plot.ready) return "Crop is not ready";
    if (invalidModifier(action.minigameModifier)) return "Invalid minigame modifier";
    pendingHarvests.push({ plot: { ...plot }, modifier: boundedModifier(action.minigameModifier) });
    plot.growth = 0; plot.ready = false; plot.wateredThisCycle = false;
    if (state.rulesetVersion >= 3 && !["lettuce", "chili-pepper"].includes(plot.crop)) plot.crop = null;
  } else if (action.type === "SET_ANIMAL") {
    const animal = livestockSlot(state, action.moduleId, action.slotIndex ?? 0);
    if (!animal) return "Livestock module not found";
    animal.animal = action.animal; animal.growth = 0; animal.fedThisCycle = false; animal.feedMinigameModifier = 0;
    if (state.rulesetVersion >= 3) { animal.satiety = 70; animal.cleanliness = 90; animal.health = 100; }
  } else if (action.type === "WATER_PLOT") {
    const plot = cropSlot(state, action.moduleId, action.slotIndex);
    if (!plot) return "Crop plot not found";
    if (!plot.crop) return "Crop plot is empty";
    if (state.rulesetVersion < 3 && plot.wateredThisCycle) return "Crop plot was already watered this cycle";
    if (state.resources.water < AGRICULTURE.waterActionCost) return "Insufficient water";
    state.resources.water -= AGRICULTURE.waterActionCost;
    plot.wateredThisCycle = true;
    if (state.rulesetVersion >= 3) plot.moisture = Math.min(100, (plot.moisture ?? 60) + 35);
  } else if (action.type === "FEED_STALL") {
    const animal = livestockSlot(state, action.moduleId, action.slotIndex);
    if (!animal) return "Livestock module not found";
    if (!animal.animal) return "Livestock stall is empty";
    if (animal.fedThisCycle) return "Livestock stall was already fed this cycle";
    if (invalidModifier(action.minigameModifier)) return "Invalid minigame modifier";
    if (state.resources.food < AGRICULTURE.feedActionCost) return "Insufficient food";
    state.resources.food -= AGRICULTURE.feedActionCost;
    animal.fedThisCycle = true;
    animal.feedMinigameModifier = boundedModifier(action.minigameModifier);
    if (state.rulesetVersion >= 3) animal.satiety = Math.min(100, (animal.satiety ?? 70) + 30);
  } else if (action.type === "PRUNE_PLOT") {
    const plot = cropSlot(state, action.moduleId, action.slotIndex);
    if (!plot?.crop) return "Crop plot is empty";
    plot.health = Math.min(100, (plot.health ?? 100) + 20);
  } else if (action.type === "CLEAN_STALL") {
    const animal = livestockSlot(state, action.moduleId, action.slotIndex);
    if (!animal?.animal) return "Livestock stall is empty";
    animal.cleanliness = Math.min(100, (animal.cleanliness ?? 90) + 35);
  } else if (action.type === "ALLOCATE_RESIDUE") {
    if ((state.production.cropResidue ?? 0) < 1) return "No crop residue available";
    state.production.cropResidue = (state.production.cropResidue ?? 0) - 1;
    if (action.destination === "feed") state.production.feedReserve = (state.production.feedReserve ?? 0) + 1;
    else state.production.nutrients = (state.production.nutrients ?? 0) + 1;
  } else if (action.type === "USE_RESEARCH") {
    if ((state.production.researchAvailable ?? 0) < 1) return "No research sample available";
    state.production.researchAvailable = (state.production.researchAvailable ?? 0) - 1;
    let message: string;
    if (action.purpose === "diagnostic") {
      const damaged = state.modules.filter(module => module.integrity < 0.8).map(module => module.id);
      const network = resolveUtilityGraph(state);
      message = `Diagnostic: ${damaged.length ? `damaged ${damaged.join(", ")}` : "no damaged modules"}; ${network.bottlenecks.length ? network.bottlenecks.slice(0, 2).join("; ") : "no reported utility bottleneck"}.`;
    } else {
      const window = `${state.turn + 1}–${Math.min(10, state.turn + 2)}`;
      const upcoming = hazardSchedule(state, seedForLevel(state)).filter(hazard => hazard.turn > state.turn && hazard.turn <= state.turn + 2);
      const band = (types: string[]) => upcoming.some(hazard => types.includes(hazard.type)) ? "Elevated" : "Low";
      message = `Refined outlook for turns ${window}: solar ${band(["radiation"])}, thermal ${band(["temperature"])}, impact ${band(["micrometeoroid"])}, systems ${band(["power", "communications"])}. Exact events remain uncertain.`;
    }
    state.history.push({ turn: state.turn, type: "RESEARCH_USED", message });
  } else {
    return "Base layout is locked during operation";
  }
  state.ap -= cost;
  return undefined;
}

function applyHazard(state: GameState, warnings: string[]): void {
  const hazard = state.activeHazard;
  if (!hazard) return;
  const protection = shelterProtection(state);
  if (hazard.type === "power") state.resources.power = Math.max(0, state.resources.power - 8 * hazard.severity);
  if (hazard.type === "radiation") state.resources.oxygen = Math.max(0, state.resources.oxygen - 4 * hazard.severity * (1 - protection));
  if (hazard.type === "micrometeoroid" && state.modules.length > 0) {
    const index = hazard.turn % state.modules.length;
    const target = state.modules[index];
    const resilience = MODULE_BY_ID.get(target.moduleId)?.resilience ?? 0;
    target.integrity = Math.max(0, target.integrity - 0.35 * hazard.severity * (1 - protection) * (1 - resilience * 0.5));
  }
  if (hazard.type === "communications") warnings.push(communicationsAvailable(state)
    ? "Communications backup maintained Mission Control link" : "Mission Control communication is unavailable this turn");
  warnings.push(`Hazard: ${hazard.type}`);
}

export function resolveTurn(state: GameState, actions: PlayerAction[], rngSeed: string): TurnResult {
  if (state.crops.some(plot => plot.crop !== null && !isCropId(plot.crop))) throw new Error('This run contains a retired crop ID. Start a new run or explicitly migrate it.');
  if (state.phase !== "operation") throw new Error("Turn resolution requires operation phase");
  if (!rngSeed) throw new Error("A deterministic RNG seed is required");
  const next: GameState = structuredClone(state);
  const before = { ...next.resources };
  const warnings: string[] = [];
  const acceptedActions: PlayerAction[] = [];
  const rejectedActions: string[] = [];
  const pendingHarvests: PendingHarvest[] = [];
  const turn = next.turn;

  // 1. Reveal hazard; 2. restore AP; 3. apply strategic actions.
  next.activeHazard = hazardForTurn(next, rngSeed);
  next.ap = apRecovery(next);
  let ended = false;
  for (const action of actions) {
    if (ended) { rejectedActions.push(`${action.type}: Turn has already ended`); continue; }
    const error = applyOperationAction(next, action, pendingHarvests);
    if (error) rejectedActions.push(`${action.type}${"moduleId" in action ? ` (${action.moduleId} slot ${"slotIndex" in action ? action.slotIndex ?? 0 : 0})` : ""}: ${error}`);
    else { acceptedActions.push(action); if (action.type === "END_TURN") ended = true; }
  }

  // 4. Network and 5. temperature. Accepted minigame modifiers were bounded above.
  const network = resolveUtilityGraph(next);
  warnings.push(...network.bottlenecks);
  next.resources.temperature = resolveTemperature(next, network);

  // 7. Crop growth and harvest; 8. livestock.
  let cropYield = 0;
  let cropFood = 0;
  const cropOutputs: Array<{ moduleId: string; slotIndex: number; yield: number }> = [];
  for (const pending of pendingHarvests) {
    const harvest = harvestCrop(next, pending.plot, network, pending.modifier);
    cropYield += harvest.yield;
    cropFood += harvest.food;
    if (next.rulesetVersion >= 3 && pending.plot.crop === "soybean" && harvest.yield > 0) next.production.cropResidue = (next.production.cropResidue ?? 0) + 1;
    next.production.researchCumulative = (next.production.researchCumulative ?? 0) + harvest.research;
    if (next.rulesetVersion >= 3) next.production.researchAvailable = (next.production.researchAvailable ?? 0) + harvest.research;
    if (harvest.research) next.history.push({ turn, type: "RESEARCH", message: `Collected ${harvest.research} research sample(s)`, amount: harvest.research });
    cropOutputs.push({ moduleId: pending.plot.moduleId, slotIndex: pending.plot.slotIndex, yield: harvest.yield });
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
  const reserveUsed = next.rulesetVersion >= 3 ? Math.min(next.production.feedReserve ?? 0, livestock.feedUsed) : 0;
  next.resources.food = Math.max(0, next.resources.food + cropFood + livestock.meatYield - baseline.food - livestock.feedUsed + reserveUsed);
  if (next.rulesetVersion >= 3) {
    next.production.feedReserve = (next.production.feedReserve ?? 0) - reserveUsed;
    if ((next.production.nutrients ?? 0) > 0) {
      const needy = next.crops.find(plot => plot.crop && (plot.health ?? 100) < 90);
      if (needy) { needy.health = Math.min(100, (needy.health ?? 100) + 12); next.production.nutrients = (next.production.nutrients ?? 0) - 1; }
    }
  }
  applyHazard(next, warnings);
  for (const key of ["power", "water", "oxygen", "food"] as const)
    next.resources[key] = Math.round(Math.min(next.resources[key], resourceCapacity(next, key)) * 10) / 10;

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
    ...cropOutputs.map((output) => ({ turn, type: "CROP_YIELD", message: `${output.moduleId} slot ${output.slotIndex} crops harvested`, amount: output.yield })),
    ...livestock.outputs.map((output) => ({ turn, type: "MEAT_YIELD", message: `${output.moduleId} slot ${output.slotIndex} livestock output`, amount: output.yield })),
    ...(next.crisis?.recoveryTurn === turn + 1 ? [{ turn, type: "CRISIS", message: next.crisis.trigger }] : []),
  ];
  next.history = [...next.history, ...events];
  next.turnRecords = [...next.turnRecords, {
    level: next.level, turn, resources: { ...next.resources }, resourceDelta: { ...resourceDelta },
    cropYield, meatYield: livestock.meatYield, crisis: !!next.crisis,
    ...(next.activeHazard ? { hazard: next.activeHazard } : {}),
  }];
  next.lastTurn = summary;
  if (next.phase === "operation") { next.turn = turn + 1; next.forecast = forecastForTurn(next); }
  return { state: next, summary, acceptedActions, rejectedActions };
}

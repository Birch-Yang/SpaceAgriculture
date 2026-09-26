import { emergencyResources, emergencySupplyAmount, suppliesRemaining, isPaused, isAgricultureAction, operationActionCost } from "./emergency.ts";
import { EMERGENCY } from "../../data/emergency.ts";
import { DIFFICULTY } from "../../data/difficulty.ts";
import { AGRICULTURE, boundedModifier } from "../../data/agriculture.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import { communicationsAvailable, connectedToHabitat, resourceCapacity, shelterProtection, SYSTEMS } from "../../data/systems.ts";
import type { CropPlotState, GameEvent, GameState, LivestockState, PlayerAction, ResourceState, TurnResult } from "../state/types.ts";
import { criticalCondition } from "./crisis.ts";
import { growCrops, harvestCrop } from "./crops.ts";
import { forecastForTurn, hazardForTurn } from "./hazards.ts";
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

function applyOperationAction(state: GameState, action: PlayerAction, pendingHarvests: PendingHarvest[], accepted: PlayerAction[]): string | undefined {
  const cost = operationActionCost(state, action, accepted);
  if (cost > state.ap) return "Insufficient action points";
  if (action.type === "END_TURN") return undefined;
  if (isAgricultureAction(action) && "moduleId" in action && isPaused(state, action.moduleId)) return "Module is paused; cancel its pause before farming";
  if (action.type === "PAUSE_MODULE") {
    const module = state.modules.find(item => item.id === action.moduleId);
    const category = module && MODULE_BY_ID.get(module.moduleId)?.category;
    if (category !== "greenhouse" && category !== "livestock") return "Only agriculture modules can be paused";
    if (isPaused(state, action.moduleId)) return "Module is already paused this turn";
    if (accepted.some(item => isAgricultureAction(item) && "moduleId" in item && item.moduleId === action.moduleId)) return "Cancel farming actions for this module before pausing it";
    state.pausedModuleIds = [...(state.pausedModuleIds ?? []), action.moduleId];
    state.history.push({ turn: state.turn, type: "EMERGENCY_PAUSE", message: `${action.moduleId} paused for one turn; resumes next turn` });
  } else if (action.type === "USE_EMERGENCY_SUPPLY") {
    if (!emergencyResources.includes(action.resource)) return "Invalid emergency resource";
    if (accepted.some(item => item.type === "USE_EMERGENCY_SUPPLY")) return "Only one emergency supply per turn";
    if (suppliesRemaining(state) <= 0) return "No emergency supplies remaining";
    const amount = Math.min(emergencySupplyAmount(action.resource), Math.max(0, resourceCapacity(state, action.resource) - state.resources[action.resource]));
    if (amount <= 0) return "Resource storage is already full";
    state.resources[action.resource] += amount;
    state.emergencySuppliesRemaining = suppliesRemaining(state) - 1;
    state.history.push({ turn: state.turn, type: "EMERGENCY_SUPPLY", message: `Emergency ${action.resource} +${amount}`, amount });
  } else if (action.type === "SET_CROP_PARAMS") {
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
  } else if (action.type === "HARVEST_CROP") {
    const plot = cropSlot(state, action.moduleId, action.slotIndex ?? 0);
    if (!plot) return "Crop plot not found";
    if (!plot.crop || !plot.ready) return "Crop is not ready";
    if (invalidModifier(action.minigameModifier)) return "Invalid minigame modifier";
    pendingHarvests.push({ plot: { ...plot }, modifier: boundedModifier(action.minigameModifier) });
    plot.growth = 0; plot.ready = false; plot.wateredThisCycle = false;
  } else if (action.type === "SET_ANIMAL") {
    const animal = livestockSlot(state, action.moduleId, action.slotIndex ?? 0);
    if (!animal) return "Livestock module not found";
    animal.animal = action.animal; animal.growth = 0; animal.fedThisCycle = false; animal.feedMinigameModifier = 0;
  } else if (action.type === "WATER_PLOT") {
    const plot = cropSlot(state, action.moduleId, action.slotIndex);
    if (!plot) return "Crop plot not found";
    if (!plot.crop) return "Crop plot is empty";
    if (plot.wateredThisCycle) return "Crop plot was already watered this cycle";
    if (state.resources.water < AGRICULTURE.waterActionCost) return "Insufficient water";
    state.resources.water -= AGRICULTURE.waterActionCost;
    plot.wateredThisCycle = true;
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
  } else {
    return "Base layout is locked during operation";
  }
  state.ap -= cost;
  return undefined;
}

export function hazardMitigationCondition(state: GameState, delivery?: Record<string, Partial<Record<"power" | "water" | "oxygen" | "food", number>>>): boolean {
  const hazard = state.activeHazard;
  if (!hazard) return false;
  if (hazard.type === "power") return state.resources.power >= EMERGENCY.powerReserveMitigationThreshold;
  if (hazard.type === "temperature") return state.modules.some(module => MODULE_BY_ID.get(module.moduleId)?.category === "utility"
    && connectedToHabitat(state, module.id) && module.integrity > 0.5
    && (module.allocation?.thermal ?? 0) >= EMERGENCY.thermalAllocationMitigationThreshold
    && (delivery?.[module.id]?.power ?? 0) >= EMERGENCY.thermalDeliveryMitigationThreshold);
  if (hazard.type === "radiation" || hazard.type === "micrometeoroid")
    return shelterProtection(state) >= EMERGENCY.shelterMitigationThreshold;
  return communicationsAvailable(state);
}

/** Current-turn response preview, using the same action and network rules as settlement. */
export function previewHazardResponse(state: GameState, actions: PlayerAction[]) {
  if (!state.activeHazard || state.phase !== "operation") return { ready: false, rejectedActions: [] as string[] };
  const plan = planOperationActions(state, actions);
  if (plan.rejectedActions.length) return { ready: false, rejectedActions: plan.rejectedActions };
  const network = resolveUtilityGraph(plan.state);
  return { ready: hazardMitigationCondition(plan.state, network.delivery), rejectedActions: [] as string[] };
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

/** Validates only player actions; never reveals or simulates future hazards. */
export function planOperationActions(state: GameState, actions: PlayerAction[]) {
  const next = structuredClone(state);
  next.pausedModuleIds = [];
  next.ap = apRecovery(state);
  const acceptedActions: PlayerAction[] = [];
  const rejectedActions: string[] = [];
  const pendingHarvests: PendingHarvest[] = [];
  if (state.phase !== "operation") return { state: next, acceptedActions, rejectedActions: ["Mission is not in operation"], pendingHarvests, apUsed: 0 };
  let ended = false;
  for (const action of actions) {
    if (ended) { rejectedActions.push(`${action.type}: Turn has already ended`); continue; }
    const error = applyOperationAction(next, action, pendingHarvests, acceptedActions);
    if (error) rejectedActions.push(`${action.type}${"moduleId" in action ? ` (${action.moduleId} slot ${"slotIndex" in action ? action.slotIndex ?? 0 : 0})` : ""}: ${error}`);
    else { acceptedActions.push(action); if (action.type === "END_TURN") ended = true; }
  }

  return { state: next, acceptedActions, rejectedActions, pendingHarvests, apUsed: apRecovery(state) - next.ap };
}

export function resolveTurn(state: GameState, actions: PlayerAction[], rngSeed: string): TurnResult {
  if (state.crops.some(plot => plot.crop !== null && !isCropId(plot.crop))) throw new Error('This run contains a retired crop ID. Start a new run or explicitly migrate it.');
  if (state.phase !== "operation") throw new Error("Turn resolution requires operation phase");
  if (!rngSeed) throw new Error("A deterministic RNG seed is required");
  const { state: next, acceptedActions, rejectedActions, pendingHarvests } = planOperationActions(state, actions);
  const before = { ...state.resources };
  const warnings: string[] = [];
  const turn = next.turn;

  // Current hazard is visible before actions; recompute from the authoritative seed for replay.
  next.activeHazard = hazardForTurn(next, rngSeed);

  // 4. Network; then evaluate defenses after the player's current-turn actions.

  const network = resolveUtilityGraph(next);
  warnings.push(...network.bottlenecks);
  if (next.activeHazard && hazardMitigationCondition(next, network.delivery)) {
    next.activeHazard = { ...next.activeHazard, severity: Math.round(next.activeHazard.severity * EMERGENCY.mitigatedSeverityFraction * 100) / 100 };
    warnings.push(`Prepared response reduced ${next.activeHazard.type} severity by 70%`);
  }
  next.resources.temperature = resolveTemperature(next, network);

  // 7. Crop growth and harvest; 8. livestock.
  let cropYield = 0;
  let cropFood = 0;
  const cropOutputs: Array<{ moduleId: string; slotIndex: number; yield: number }> = [];
  for (const pending of pendingHarvests) {
    const harvest = harvestCrop(next, pending.plot, network, pending.modifier);
    cropYield += harvest.yield;
    cropFood += harvest.food;
    next.production.researchCumulative = (next.production.researchCumulative ?? 0) + harvest.research;
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
  next.resources.food = Math.max(0, next.resources.food + cropFood + livestock.meatYield - baseline.food - livestock.feedUsed);
  applyHazard(next, warnings);
  for (const key of ["power", "water", "oxygen", "food"] as const)
    next.resources[key] = Math.round(Math.min(next.resources[key], resourceCapacity(next, key)) * 10) / 10;

  // 11. Resolve survival now; no extra recovery turn is created.
  const critical = criticalCondition(next);
  next.crisis = undefined;
  if (critical) {
    next.phase = "complete";
    next.passed = false;
    next.failureReason = `Critical system at end of turn: ${critical}`;
    warnings.push(next.failureReason);
  }

  if (next.phase === "operation" && turn >= 10) {
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
    ...(critical ? [{ turn, type: "CRISIS", message: critical }] : []),
  ];
  next.history = [...next.history, ...events];
  next.turnRecords = [...next.turnRecords, {
    level: next.level, turn, resources: { ...next.resources }, resourceDelta: { ...resourceDelta },
    cropYield, meatYield: livestock.meatYield, crisis: !!critical,
    ...(next.activeHazard ? { hazard: next.activeHazard } : {}),
  }];
  next.pausedModuleIds = [];
  next.lastTurn = summary;
  if (next.phase === "operation") {
    next.turn = turn + 1;
    next.forecast = forecastForTurn(next);
    next.activeHazard = hazardForTurn(next, rngSeed);
  }
  return { state: next, summary, acceptedActions, rejectedActions };
}

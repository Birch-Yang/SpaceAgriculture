import type { GameEvent, GameState } from "../game/state/types.ts";
import { scoreRules } from "../game/simulation/scoring.ts";
import { MODULE_BY_ID } from "../data/modules.ts";
import { connectedToHabitat, moduleDistance } from "../data/systems.ts";
import type { RunTranscript } from "../game/state/transcript.ts";

export type ScientificSource = { id: string; title: string; organization: string; url: string; tags: string[]; shortContext: string };
export type RunSummary = {
  mode: string;
  finalScoreInputs: Record<string, number>;
  layoutMetrics: Record<string, number>;
  productionMetrics: Record<string, number>;
  stabilityMetrics: Record<string, number>;
  hazardHistory: GameEvent[];
  majorPlayerDecisions: string[];
  photonAdviceHistory: string[];
};
export type EvaluationResult = {
  strategicCoherence: number;
  designInnovation: number;
  tradeoffQuality: number;
  scientificReasoning: number;
  rationale: string;
  total: number;
};

const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : 0;

function majorDecisions(state: GameState, transcript?: RunTranscript): string[] {
  if (!transcript) return [...new Set(state.modules.map((module) => module.moduleId))].slice(0, 12);
  const counts = new Map<string, number>();
  const add = (label: string) => counts.set(label, (counts.get(label) ?? 0) + 1);
  for (const step of transcript.steps) {
    if (step.kind !== "build" && step.kind !== "turn") continue;
    const actions = step.kind === "build" ? [step.action] : step.actions;
    for (const action of actions) {
      if (action.type === "PLACE_MODULE") add(`Built ${MODULE_BY_ID.get(action.moduleId)?.label ?? action.moduleId}`);
      if (action.type === "MOVE_MODULE") add("Moved a module during construction");
      if (action.type === "PLACE_CORRIDOR") add("Routed a utility corridor");
      if (action.type === "REMOVE_CORRIDOR") add("Removed a utility corridor");
      if (action.type === "REPAIR") add("Repaired infrastructure");
      if (action.type === "REALLOCATE_UTILITY") add("Reallocated a multifunction utility");
      if (action.type === "PLANT_CROP") add(`Planted ${action.crop}`);
      if (action.type === "SET_ANIMAL") add(`Selected ${action.animal} livestock`);
      if (action.type === "WATER_PLOT") add("Watered a crop plot");
      if (action.type === "FEED_STALL") add("Fed a livestock stall");
      if (action.type === "SET_CROP_PARAMS") add(`Set crop conditions to ${action.water} water, ${action.light} light, ${action.temperature} temperature`);
      if (action.type === "SET_LIVESTOCK_PARAMS") add(`Set livestock feed to ${action.feed}`);
    }
  }
  return [...counts].slice(0, 20).map(([label, count]) => `${label}${count > 1 ? ` (${count} times)` : ""}`);
}

export function buildRunSummary(state: GameState, transcript?: RunTranscript): RunSummary {
  const rules = scoreRules(state);
  const greenhouses = state.modules.filter((module) => module.moduleId.startsWith("greenhouse"));
  const livestock = state.modules.filter((module) => module.moduleId.startsWith("livestock"));
  const water = state.modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "water");
  const utilities = state.modules.filter((module) => MODULE_BY_ID.get(module.moduleId)?.category === "utility");
  const distanceTo = (targets: typeof state.modules) => targets.length ? average(greenhouses
    .map((greenhouse) => Math.min(...targets.map((target) => moduleDistance(greenhouse, target))))) : 0;
  const totalCost = state.modules.reduce((sum, module) => sum + (MODULE_BY_ID.get(module.moduleId)?.cost ?? 0), 0);
  const resilienceCost = state.modules.reduce((sum, module) => sum + (["shelter", "utility", "battery"].includes(MODULE_BY_ID.get(module.moduleId)?.category ?? "")
    ? (MODULE_BY_ID.get(module.moduleId)?.cost ?? 0) : 0), 0);
  const records = state.turnRecords;
  return {
    mode: state.mode,
    finalScoreInputs: { production: rules.production, stability: rules.stability, efficiency: rules.efficiency, resilience: rules.resilience, budget: rules.budget },
    layoutMetrics: { moduleCount: state.modules.length, corridorLength: state.utilityEdges.reduce((sum, edge) => sum + edge.length, 0), greenhouseCount: greenhouses.length, livestockModuleCount: livestock.length, waterModuleCount: water.length, utilityModuleCount: utilities.length, remainingBudget: state.budget,
      averageGreenhouseWaterDistance: distanceTo(water), averageGreenhouseUtilityDistance: distanceTo(utilities),
      connectedModuleShare: state.modules.length ? Math.round(state.modules.filter((module) => connectedToHabitat(state, module.id)).length / state.modules.length * 100) / 100 : 0,
      resilienceBudgetShare: totalCost ? Math.round(resilienceCost / totalCost * 100) / 100 : 0,
      compactGreenhouseShare: greenhouses.length ? Math.round(greenhouses.filter((module) => module.moduleId === "greenhouse-compact").length / greenhouses.length * 100) / 100 : 0 },
    productionMetrics: { cropYield: state.production.cropCumulative, meatYield: state.production.meatCumulative, researchSamples: state.production.researchCumulative ?? 0,
      cropToMeatRatio: state.production.meatCumulative > 0 ? Math.round(state.production.cropCumulative / state.production.meatCumulative * 100) / 100 : 0,
      cropYieldPerGreenhouse: greenhouses.length ? Math.round(state.production.cropCumulative / greenhouses.length * 100) / 100 : 0 },
    stabilityMetrics: { finalPower: state.resources.power, finalWater: state.resources.water, finalOxygen: state.resources.oxygen, finalFood: state.resources.food, finalTemperature: state.resources.temperature, crisisCount: state.history.filter((event) => event.type === "CRISIS").length,
      averagePower: average(records.map((record) => record.resources.power)), averageWater: average(records.map((record) => record.resources.water)),
      averageOxygen: average(records.map((record) => record.resources.oxygen)), averageFood: average(records.map((record) => record.resources.food)),
      hazardTurns: records.filter((record) => !!record.hazard).length },
    hazardHistory: state.history.filter((event) => event.type === "HAZARD"),
    majorPlayerDecisions: majorDecisions(state, transcript),
    photonAdviceHistory: state.history.filter((event) => event.type === "PHOTON_ADVICE").map((event) => event.message),
  };
}

export function validateEvaluation(value: unknown): EvaluationResult | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  const keys = ["strategicCoherence", "designInnovation", "tradeoffQuality", "scientificReasoning"] as const;
  const limits = [10, 8, 7, 5];
  const result: Record<string, number> = {};
  for (let i = 0; i < keys.length; i++) {
    const numeric = Number(item[keys[i]]);
    if (!Number.isFinite(numeric)) return undefined;
    result[keys[i]] = Math.max(0, Math.min(limits[i], numeric));
  }
  const rationale = typeof item.rationale === "string" ? item.rationale.slice(0, 1200) : "No rationale supplied";
  return { strategicCoherence: result.strategicCoherence, designInnovation: result.designInnovation, tradeoffQuality: result.tradeoffQuality, scientificReasoning: result.scientificReasoning, rationale,
    total: Math.round(keys.reduce((sum, key) => sum + result[key], 0) * 10) / 10 };
}

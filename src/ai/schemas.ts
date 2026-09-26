import type { GameEvent, GameState } from "../game/state/types.ts";
import { scoreRules } from "../game/simulation/scoring.ts";

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

export function buildRunSummary(state: GameState): RunSummary {
  const rules = scoreRules(state);
  const greenhouses = state.modules.filter((module) => module.moduleId.startsWith("greenhouse"));
  const livestock = state.modules.filter((module) => module.moduleId.startsWith("livestock"));
  return {
    mode: state.mode,
    finalScoreInputs: { production: rules.production, stability: rules.stability, efficiency: rules.efficiency, resilience: rules.resilience, budget: rules.budget },
    layoutMetrics: { moduleCount: state.modules.length, corridorLength: state.utilityEdges.reduce((sum, edge) => sum + edge.length, 0), greenhouseCount: greenhouses.length, livestockModuleCount: livestock.length, remainingBudget: state.budget },
    productionMetrics: { cropYield: state.production.cropCumulative, meatYield: state.production.meatCumulative },
    stabilityMetrics: { finalPower: state.resources.power, finalWater: state.resources.water, finalOxygen: state.resources.oxygen, finalFood: state.resources.food, finalTemperature: state.resources.temperature, crisisCount: state.history.filter((event) => event.type === "CRISIS").length },
    hazardHistory: state.history.filter((event) => event.type === "HAZARD"),
    majorPlayerDecisions: [...new Set([...greenhouses.map((module) => module.moduleId), ...livestock.map((module) => module.moduleId)])],
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

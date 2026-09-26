import { DIFFICULTY } from "../../data/difficulty.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
import { connectedToHabitat } from "../../data/systems.ts";
import type { GameState } from "../state/types.ts";

const clamp = (value: number, maximum: number) => Math.round(Math.max(0, Math.min(maximum, value)) * 10) / 10;

export type RuleScore = {
  production: number;
  stability: number;
  efficiency: number;
  resilience: number;
  budget: number;
  total: number;
};

export function scoreRules(state: GameState): RuleScore {
  const target = DIFFICULTY[state.mode][state.level - 1];
  const crop = target.cropTarget ? state.production.cropCumulative / target.cropTarget : 0;
  const meat = target.meatTarget ? state.production.meatCumulative / target.meatTarget : 0;
  const production = clamp((crop + meat) / 2 * 28, 28);
  const records = state.turnRecords.length ? state.turnRecords : [{ resources: state.resources, crisis: !!state.crisis }];
  const stabilityFactor = records.reduce((sum, record) => {
    const stable = (["power", "water", "oxygen", "food"] as const).filter((key) => record.resources[key] > 0).length / 4;
    const temperature = record.resources.temperature >= 10 && record.resources.temperature <= 30 ? 1 : 0.5;
    return sum + stable * temperature * (record.crisis ? 0.65 : 1);
  }, 0) / records.length;
  const stability = clamp(24 * stabilityFactor, 24);
  const totalBudget = state.mode === "challenge" ? target.budget : DIFFICULTY.progressive[0].budget
    + DIFFICULTY.progressive.slice(1, state.level).reduce((sum, level) => sum + level.buildBudget, 0);
  const spentBudget = Math.max(1, totalBudget - state.budget);
  const efficiency = clamp(8 * Math.min(1, (state.production.cropCumulative + state.production.meatCumulative) / spentBudget * 2), 8);
  const protective = state.modules.reduce((sum, module) => sum + (["shelter", "utility", "battery"].includes(MODULE_BY_ID.get(module.moduleId)?.category ?? "")
    && connectedToHabitat(state, module.id) ? Math.max(0, Math.min(1, module.integrity)) : 0), 0);
  const hazardRecords = state.turnRecords.filter((record) => record.hazard);
  const response = hazardRecords.length ? hazardRecords.filter((record) => !record.crisis).length / hazardRecords.length : 1;
  const resilience = clamp(6 * (0.7 * Math.min(1, protective / 3) + 0.3 * response), 6);
  const budget = clamp(4 * Math.max(0, state.budget) / Math.max(1, totalBudget), 4);
  return { production, stability, efficiency, resilience, budget, total: clamp(production + stability + efficiency + resilience + budget, 70) };
}

export function scoreWithFallback(rules: RuleScore, llmScore?: number): { rules: number; llm: number; total: number; usedFallback: boolean } {
  if (llmScore === undefined || !Number.isFinite(llmScore)) return { rules: rules.total, llm: Math.round(rules.total / 70 * 30 * 10) / 10, total: Math.round(rules.total / 70 * 100 * 10) / 10, usedFallback: true };
  const llm = clamp(llmScore, 30);
  return { rules: rules.total, llm, total: Math.round((rules.total + llm) * 10) / 10, usedFallback: false };
}

import { DIFFICULTY } from "../../data/difficulty.ts";
import { MODULE_BY_ID } from "../../data/modules.ts";
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
  const stable = ["power", "water", "oxygen", "food"].filter((key) => state.resources[key as keyof typeof state.resources] > 0).length / 4;
  const temperature = state.resources.temperature >= 10 && state.resources.temperature <= 30 ? 1 : 0.5;
  const stability = clamp(24 * stable * temperature * (state.crisis ? 0.65 : 1), 24);
  const efficiency = clamp(8 * Math.min(1, (state.production.cropCumulative + state.production.meatCumulative) / Math.max(1, target.budget - state.budget) * 2), 8);
  const protective = state.modules.filter((module) => ["shelter", "utility", "battery"].includes(MODULE_BY_ID.get(module.moduleId)?.category ?? "")).length;
  const resilience = clamp(6 * Math.min(1, protective / 3), 6);
  const budget = clamp(4 * Math.max(0, state.budget) / Math.max(1, target.budget), 4);
  return { production, stability, efficiency, resilience, budget, total: clamp(production + stability + efficiency + resilience + budget, 70) };
}

export function scoreWithFallback(rules: RuleScore, llmScore?: number): { rules: number; llm: number; total: number; usedFallback: boolean } {
  if (llmScore === undefined || !Number.isFinite(llmScore)) return { rules: rules.total, llm: Math.round(rules.total / 70 * 30 * 10) / 10, total: Math.round(rules.total / 70 * 100 * 10) / 10, usedFallback: true };
  const llm = clamp(llmScore, 30);
  return { rules: rules.total, llm, total: Math.round((rules.total + llm) * 10) / 10, usedFallback: false };
}

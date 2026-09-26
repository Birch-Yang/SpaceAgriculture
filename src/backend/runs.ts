import { scoreRules, scoreWithFallback } from "../game/simulation/scoring.ts";
import type { GameState } from "../game/state/types.ts";
import type { EvaluationResult } from "../ai/schemas.ts";
import type { MissionReport } from "../ai/report.ts";
import type { RunTranscript } from "../game/state/transcript.ts";
import { publicSupabase, serverSupabase } from "./supabase.ts";
import { CROP_BALANCE_VERSION, CROP_SCHEMA_VERSION } from '../data/cropCatalog.ts';

export type LeaderboardCategory = "overall" | "production" | "stability" | "efficiency" | "resilience";
const scoreColumns: Record<LeaderboardCategory, string> = {
  overall: "score_total", production: "score_production", stability: "score_stability",
  efficiency: "score_efficiency", resilience: "score_resilience",
};

export async function saveCompletedRun(state: GameState, evaluation: EvaluationResult | undefined, report: MissionReport, transcript?: RunTranscript) {
  if (state.phase !== "complete") throw new Error("Only completed runs can be saved");
  const client = serverSupabase();
  if (!client) return { saved: false, reason: "Supabase is not configured" } as const;
  const rules = scoreRules(state);
  const score = scoreWithFallback(rules, evaluation?.total);
  const row = {
    id: state.runId, nickname: state.nickname, mode: state.mode, score_total: score.total,
    score_rules: score.rules, score_llm: score.llm, score_production: rules.production,
    score_stability: rules.stability, score_efficiency: rules.efficiency,
    score_resilience: rules.resilience, score_budget: rules.budget,
    crop_yield: state.production.cropCumulative, meat_yield: state.production.meatCumulative,
    passed: state.passed ?? false,
    layout_json: { modules: state.modules, utilityEdges: state.utilityEdges },
    strategy_json: { cropSchemaVersion: CROP_SCHEMA_VERSION, cropBalanceVersion: CROP_BALANCE_VERSION, crops: state.crops, livestock: state.livestock },
    hazard_json: state.history.filter((event) => event.type === "HAZARD"),
    summary_json: { state: { level: state.level, turn: state.turn, resources: state.resources, researchSamples: state.production.researchCumulative ?? 0 }, evaluation, report, usedFallback: score.usedFallback,
      replay: { transcript, turnRecords: state.turnRecords } },
  };
  const { error } = await client.from("runs").insert(row);
  return error ? { saved: false, reason: error.message } as const : { saved: true } as const;
}

export async function getLeaderboard(category: LeaderboardCategory, limit = 20) {
  const client = publicSupabase();
  if (!client) return [];
  const { data, error } = await client.from("runs")
    .select("id,nickname,mode,score_total,score_production,score_stability,score_efficiency,score_resilience,crop_yield,meat_yield,passed,created_at")
    .order(scoreColumns[category], { ascending: false }).limit(Math.min(100, Math.max(1, limit)));
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getReport(runId: string) {
  const client = publicSupabase();
  if (!client) return undefined;
  const { data, error } = await client.from("runs").select("id,nickname,mode,passed,score_total,score_rules,score_llm,score_production,score_stability,score_efficiency,score_resilience,score_budget,summary_json").eq("id", runId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

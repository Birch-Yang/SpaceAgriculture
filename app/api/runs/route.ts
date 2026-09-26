import { NextResponse } from "next/server";
import { buildRunSummary } from "../../../src/ai/schemas.ts";
import { evaluateStrategy } from "../../../src/ai/evaluation.ts";
import { generateMissionReport } from "../../../src/ai/report.ts";
import { verifiedSources } from "../../../src/ai/sourceAdapter.ts";
import { getReport, saveCompletedRun } from "../../../src/backend/runs.ts";
import { scoreRules, scoreWithFallback } from "../../../src/game/simulation/scoring.ts";
import type { GameState } from "../../../src/game/state/types.ts";

function validCompletedState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return typeof state.runId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state.runId)
    && typeof state.nickname === "string" && state.nickname.trim().length >= 1 && state.nickname.length <= 32
    && (state.mode === "challenge" || state.mode === "progressive") && state.phase === "complete"
    && Array.isArray(state.modules) && state.modules.length <= 100 && Array.isArray(state.utilityEdges) && state.utilityEdges.length <= 300
    && Array.isArray(state.history) && state.history.length <= 500 && !!state.production && !!state.resources
    && Number.isFinite(state.production.cropCumulative) && state.production.cropCumulative >= 0 && state.production.cropCumulative <= 100000
    && Number.isFinite(state.production.meatCumulative) && state.production.meatCumulative >= 0 && state.production.meatCumulative <= 100000
    && ["power", "water", "oxygen", "food", "temperature"].every((key) => Number.isFinite(state.resources?.[key as keyof typeof state.resources]));
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const state = (body as { state?: unknown } | null)?.state;
  if (!validCompletedState(state)) return NextResponse.json({ error: "Invalid completed run" }, { status: 400 });
  try {
    const existing = await getReport(state.runId);
    if (existing) return NextResponse.json({ error: "Run already submitted", runId: state.runId }, { status: 409 });
  } catch { /* Local result generation still works when Supabase is unavailable. */ }
  const summary = buildRunSummary(state);
  const evaluation = await evaluateStrategy(summary);
  const report = await generateMissionReport(summary, !!state.passed, verifiedSources);
  const rules = scoreRules(state);
  const score = scoreWithFallback(rules, evaluation?.total);
  let saved: Awaited<ReturnType<typeof saveCompletedRun>>;
  try { saved = await saveCompletedRun(state, evaluation, report); }
  catch { saved = { saved: false, reason: "Supabase write unavailable" }; }
  return NextResponse.json({ runId: state.runId, score, report, ...saved }, { status: saved.saved ? 201 : 202 });
}

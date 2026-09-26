import { NextResponse } from "next/server";
import { buildRunSummary } from "../../../src/ai/schemas.ts";
import { evaluateStrategy } from "../../../src/ai/evaluation.ts";
import { fallbackReport, generateMissionReport } from "../../../src/ai/report.ts";
import { verifiedSources } from "../../../src/ai/sourceAdapter.ts";
import { getReport, saveCompletedRun } from "../../../src/backend/runs.ts";
import { cacheSubmission, claimSubmission, getSubmission, type CachedResult } from "../../../src/backend/submissions.ts";
import { missionAdviceHistory } from "../../../src/backend/missionSessions.ts";
import { scoreRules, scoreWithFallback } from "../../../src/game/simulation/scoring.ts";
import { parseTranscript, replayTranscript } from "../../../src/game/state/transcript.ts";
import type { RunTranscript } from "../../../src/game/state/transcript.ts";
import type { GameState } from "../../../src/game/state/types.ts";

export const maxDuration = 60;

function responseFor(state: GameState, result: CachedResult, saved: boolean, reason?: string) {
  const score = scoreWithFallback(scoreRules(state), result.evaluation?.total);
  return NextResponse.json({ runId: state.runId, score, report: result.report, saved, ...(reason ? { reason } : {}) },
    { status: saved ? 201 : 202 });
}

async function persist(state: GameState, transcript: RunTranscript, result: CachedResult) {
  try {
    const saved = await saveCompletedRun(state, result.evaluation, result.report, transcript);
    if (saved.saved) await cacheSubmission(state.runId, result, true);
    return responseFor(state, result, saved.saved, "reason" in saved ? saved.reason : undefined);
  } catch {
    return responseFor(state, result, false, "Supabase write unavailable; retry this result later");
  }
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 128_000) return NextResponse.json({ error: "Run transcript too large" }, { status: 413 });
  let transcript: RunTranscript;
  let state: GameState;
  try {
    const body = await request.text();
    if (body.length > 128_000) return NextResponse.json({ error: "Run transcript too large" }, { status: 413 });
    transcript = parseTranscript((JSON.parse(body) as { transcript?: unknown }).transcript);
    state = replayTranscript(transcript);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid run transcript" }, { status: 400 });
  }

  const summary = buildRunSummary(state);
  try { summary.photonAdviceHistory = await missionAdviceHistory(state.runId); } catch { /* Advisor history is optional. */ }
  try {
    if (await getReport(state.runId)) return NextResponse.json({ error: "Run already submitted", runId: state.runId }, { status: 409 });
  } catch { /* The submission gate below handles database outages. */ }
  const claim = await claimSubmission(state.runId, request);
  if (claim === "duplicate") {
    const cached = await getSubmission(state.runId);
    if (cached?.saved) return NextResponse.json({ error: "Run already submitted", runId: state.runId }, { status: 409 });
    if (cached?.result) return persist(state, transcript, cached.result);
    return NextResponse.json({ error: "Run is being processed", runId: state.runId }, { status: 409 });
  }
  if (claim !== "claimed") {
    const reason = claim === "rate_limited" ? "Daily submission limit reached" : "Supabase submission gate unavailable";
    return responseFor(state, { report: fallbackReport(summary, !!state.passed, verifiedSources) }, false, reason);
  }

  const evaluation = await evaluateStrategy(summary);
  const report = await generateMissionReport(summary, !!state.passed, verifiedSources);
  const result: CachedResult = { evaluation, report };
  await cacheSubmission(state.runId, result, false);
  return persist(state, transcript, result);
}

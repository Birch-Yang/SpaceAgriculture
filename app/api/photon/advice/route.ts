import { NextResponse } from "next/server";
import { generatePhotonAdvice } from "../../../../src/ai/photonAdvisor.ts";
import { serverSupabase } from "../../../../src/backend/supabase.ts";
import type { GameState } from "../../../../src/game/state/types.ts";

function validState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<GameState>;
  return typeof state.runId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state.runId)
    && Number.isInteger(state.turn) && Number(state.turn) > 0 && (state.phase === "operation")
    && (state.mode === "challenge" || state.mode === "progressive") && !!state.resources && !!state.production
    && [state.resources.power, state.resources.water, state.resources.oxygen, state.resources.temperature,
      state.production.cropCumulative, state.production.meatCumulative].every((value) => Number.isFinite(value));
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const payload = body as { state?: unknown; question?: unknown } | null;
  if (!validState(payload?.state) || typeof payload?.question !== "string")
    return NextResponse.json({ error: "Photon is available during mission operations." }, { status: 400 });
  const question = payload.question.trim();
  if (!question || question.length > 500) return NextResponse.json({ error: "Keep your transmission under 500 characters." }, { status: 400 });
  if (payload.state.activeHazard?.type === "communications")
    return NextResponse.json({ error: "MISSION CONTROL LINK LOST" }, { status: 503 });
  if (!process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: "Mission Control is offline. Earth-side advisor credentials are not configured." }, { status: 503 });

  const database = serverSupabase();
  if (!database) return NextResponse.json({ error: "Mission Control quota service is not configured." }, { status: 503 });
  const { data: claimed, error: quotaError } = await database.rpc("claim_photon_advice", {
    p_run_id: payload.state.runId,
    p_turn: payload.state.turn,
  });
  if (quotaError) return NextResponse.json({ error: "Mission Control quota service is unavailable." }, { status: 503 });
  if (typeof claimed !== "number") return NextResponse.json({ error: "Earth–Moon link budget exhausted for this turn. Try again next turn." }, { status: 429 });

  const advice = await generatePhotonAdvice(payload.state, question);
  if (!advice) return NextResponse.json({ error: "Mission Control could not form a reliable hint. The transmission was used." }, { status: 503 });
  return NextResponse.json({ advice, used: claimed, limit: 2 });
}

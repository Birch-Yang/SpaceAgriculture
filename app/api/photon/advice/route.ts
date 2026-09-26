import { NextResponse } from "next/server";
import { answerPhotonQuestion } from "../../../../src/ai/photonQuestions.ts";
import { photonConfigured, sendIMessage } from "../../../../src/ai/spectrum.ts";
import { appendMissionAdvice, claimPlayerQuestion, missionSessionByRun, validSessionToken } from "../../../../src/backend/missionSessions.ts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: { runId?: unknown; token?: unknown; turn?: unknown; question?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 8_000) return NextResponse.json({ error: "Transmission too large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Invalid transmission" }, { status: 400 }); }
  if (!body || typeof body.runId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.runId)
    || typeof body.question !== "string" || !Number.isInteger(body.turn) || Number(body.turn) < 1 || Number(body.turn) > 30)
    return NextResponse.json({ error: "Invalid mission question" }, { status: 400 });
  if (!photonConfigured()) return NextResponse.json({ error: "Mission Control relay is not configured." }, { status: 503 });
  try {
    const session = await missionSessionByRun(body.runId);
    if (!session || !validSessionToken(session, body.token))
      return NextResponse.json({ error: "Link your iMessage address when launching the mission to contact Photon." }, { status: 401 });
    const result = await answerPhotonQuestion(session, body.question, Number(body.turn), {
      claim: claimPlayerQuestion,
      send: (active, text) => sendIMessage(active.spaceId, text, active.phone),
      record: appendMissionAdvice,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "Mission Control temporarily unavailable." }, { status: 503 });
  }
}

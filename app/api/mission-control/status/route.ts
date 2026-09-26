import { NextResponse } from "next/server";
import { missionSessionByRun, playerQuestionUsage, validSessionToken } from "../../../../src/backend/missionSessions.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { runId?: unknown; token?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2_000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || typeof body.runId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.runId))
    return NextResponse.json({ error: "Invalid mission" }, { status: 400 });
  try {
    const session = await missionSessionByRun(body.runId);
    if (!session || !validSessionToken(session, body.token)) return NextResponse.json({ error: "Relay session unavailable" }, { status: 401 });
    return NextResponse.json({ history: session.adviceHistory, turn: session.lastTurn, outage: session.outage,
      used: await playerQuestionUsage(session.runId, session.lastTurn), limit: 2 });
  } catch { return NextResponse.json({ error: "Mission Control temporarily unavailable" }, { status: 503 }); }
}

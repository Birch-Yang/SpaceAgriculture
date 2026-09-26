import { NextResponse } from "next/server";
import { eventAdvice } from "../../../../src/ai/advisor.ts";
import { validAgentPublicState, type AgentEvent } from "../../../../src/ai/publicState.ts";
import { sendIMessage } from "../../../../src/ai/spectrum.ts";
import { appendMissionAdvice, missionSessionByRun, updateMissionSession, validSessionToken } from "../../../../src/backend/missionSessions.ts";

export const runtime = "nodejs";
export const maxDuration = 30;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedEvents = new Set(["WATER_CRISIS", "CRISIS_RECOVERY", "CROP_YIELD_MILESTONE", "MEAT_YIELD_MILESTONE",
  "POWER_INSTABILITY", "CROP_OUTPUT_BEHIND", "PRODUCTION_TARGET_REACHED", "THERMAL_CONFIGURATION"]);

export async function POST(request: Request) {
  let body: { runId?: unknown; token?: unknown; turn?: unknown; publicState?: unknown; outage?: unknown; event?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.runId !== "string" || !uuid.test(body.runId) || !Number.isInteger(body.turn)
    || Number(body.turn) < 1 || Number(body.turn) > 30 || typeof body.outage !== "boolean" || !validAgentPublicState(body.publicState))
    return NextResponse.json({ error: "Invalid Mission Control update" }, { status: 400 });
  let event: AgentEvent | undefined;
  if (body.event !== undefined) {
    const item = body.event as Partial<AgentEvent>;
    if (!item || typeof item !== "object" || typeof item.type !== "string" || !allowedEvents.has(item.type)
      || !Array.isArray(item.context) || item.context.length > 3 || !item.context.every((text) => typeof text === "string" && text.length <= 100))
      return NextResponse.json({ error: "Invalid advisor event" }, { status: 400 });
    event = { type: item.type, publicState: body.publicState, context: item.context };
  }
  try {
    const session = await missionSessionByRun(body.runId);
    if (!session) return NextResponse.json({ status: "unavailable", text: "Mission Control session expired" }, { status: 503 });
    if (!validSessionToken(session, body.token)) return NextResponse.json({ error: "Unauthorized Mission Control update" }, { status: 401 });
    if (!await updateMissionSession(body.runId, body.publicState, Number(body.turn), body.outage))
      return NextResponse.json({ status: "no-event" });
    if (body.outage) return NextResponse.json({ status: "offline", text: "Mission Control communication lost" });
    if (!event) return NextResponse.json({ status: "no-event" });
    const text = await eventAdvice(event);
    await sendIMessage(session.spaceId, text, session.phone);
    await appendMissionAdvice(body.runId, text);
    return NextResponse.json({ status: "sent", text });
  } catch {
    return NextResponse.json({ status: "unavailable", text: "Mission Control temporarily unavailable" }, { status: 503 });
  }
}

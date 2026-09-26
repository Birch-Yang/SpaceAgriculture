import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { validAgentPublicState } from "../../../../src/ai/publicState.ts";
import { photonConfigured, sendIMessage, startIMessage } from "../../../../src/ai/spectrum.ts";
import { claimMissionEnrollment, hashSessionToken, registerMissionSession } from "../../../../src/backend/missionSessions.ts";
import { requesterHash } from "../../../../src/backend/submissions.ts";
import { serverSupabase } from "../../../../src/backend/supabase.ts";
import { photonCredentials } from "../../../../src/ai/photonConfig.ts";

export const runtime = "nodejs";
export const maxDuration = 30;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const addressPattern = /^(?:\+[1-9]\d{6,14}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

export async function POST(request: Request) {
  if (!photonConfigured() || !photonCredentials().webhookSecret || (process.env.MISSION_SESSION_SECRET?.length ?? 0) < 32 || !serverSupabase())
    return NextResponse.json({ status: "unavailable", text: "Mission Control relay setup is incomplete. You can continue the mission without messaging." }, { status: 503 });
  let body: { runId?: unknown; address?: unknown; publicState?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 4_000) return NextResponse.json({ error: "Enrollment too large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body.runId !== "string" || !uuid.test(body.runId) || typeof body.address !== "string"
    || body.address.length > 254 || !addressPattern.test(body.address) || !validAgentPublicState(body.publicState))
    return NextResponse.json({ error: "Invalid Mission Control enrollment" }, { status: 400 });
  try {
    if (!await claimMissionEnrollment(body.runId, requesterHash(request)))
      return NextResponse.json({ status: "unavailable", text: "Mission Control enrollment limit reached or already requested" }, { status: 429 });
    const token = randomBytes(32).toString("base64url");
    const space = await startIMessage(body.address);
    if (!await registerMissionSession(body.runId, space.spaceId, space.phone, hashSessionToken(token), body.publicState)) throw new Error("Session store unavailable");
    await sendIMessage(space.spaceId, `Photon · Earth Mission Control linked to lunar run ${body.runId.slice(0, 8)}. Begin mission operations to open the relay. You can ask two questions per turn, shared between the game and this chat; I offer inspection hints only.`, space.phone);
    return NextResponse.json({ status: "online", token });
  } catch {
    return NextResponse.json({ status: "unavailable", text: "Photon could not establish the relay. Check the project's messaging line, registered recipient, and database setup before a new launch." }, { status: 503 });
  }
}

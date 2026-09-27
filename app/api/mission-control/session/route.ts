import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { validAgentPublicState } from "../../../../src/ai/publicState.ts";
import { normalizeIMessagePhone, openingMessage } from "../../../../src/ai/missionProtocol.ts";
import { photonConfigured, sendIMessage, startIMessage } from "../../../../src/ai/spectrum.ts";
import { claimMissionEnrollment, hashSessionToken, registerMissionSession } from "../../../../src/backend/missionSessions.ts";
import { requesterHash } from "../../../../src/backend/submissions.ts";
import { serverSupabase } from "../../../../src/backend/supabase.ts";

export const runtime = "nodejs";
export const maxDuration = 30;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!photonConfigured() || !process.env.SPECTRUM_WEBHOOK_SECRET || !process.env.MISSION_SESSION_SECRET || !serverSupabase())
    return NextResponse.json({ status: "unavailable", text: "Photon relay is not configured yet" }, { status: 503 });
  let body: { runId?: unknown; address?: unknown; publicState?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const address = typeof body.address === "string" && body.address.length <= 32 ? normalizeIMessagePhone(body.address) : undefined;
  if (typeof body.runId !== "string" || !uuid.test(body.runId) || !address || !validAgentPublicState(body.publicState))
    return NextResponse.json({ error: "Invalid Mission Control enrollment" }, { status: 400 });
  try {
    if (!await claimMissionEnrollment(body.runId, requesterHash(request)))
      return NextResponse.json({ status: "unavailable", text: "Mission Control enrollment limit reached or already requested" }, { status: 429 });
    const token = randomBytes(32).toString("base64url");
    const space = await startIMessage(address);
    if (!await registerMissionSession(body.runId, space.spaceId, space.phone, hashSessionToken(token), body.publicState)) throw new Error("Session store unavailable");
    await sendIMessage(space.spaceId, openingMessage, space.phone);
    return NextResponse.json({ status: "online", token, opening: openingMessage });
  } catch (error) {
    if (error instanceof Error && error.message === "This address is not reachable through iMessage")
      return NextResponse.json({ status: "unavailable", text: error.message }, { status: 422 });
    if (error instanceof Error && error.message.includes("Target not allowed for this project"))
      return NextResponse.json({ status: "unavailable", text: "This iMessage number is not active in this Photon project's Users list yet." }, { status: 422 });
    return NextResponse.json({ status: "unavailable", text: "Mission Control temporarily unavailable" }, { status: 503 });
  }
}

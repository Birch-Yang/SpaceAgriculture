import { NextResponse } from "next/server";
import { replyAdvice } from "../../../../src/ai/advisor.ts";
import { parseInboundQuestion, questionLimitMessage } from "../../../../src/ai/missionProtocol.ts";
import { sendIMessage } from "../../../../src/ai/spectrum.ts";
import { verifySpectrumWebhook } from "../../../../src/ai/webhookSignature.ts";
import { appendMissionAdvice, claimMissionMessageSlot, claimMissionQuestion, claimWebhookMessage, missionSessionBySpace, releaseMissionMessageSlot } from "../../../../src/backend/missionSessions.ts";

export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const secret = process.env.SPECTRUM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  if (!verifySpectrumWebhook(raw, request.headers, secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const inbound = parseInboundQuestion(payload);
  if (!inbound) return NextResponse.json({ ok: true });
  try {
    const session = await missionSessionBySpace(inbound.spaceId);
    if (!session || session.outage) return NextResponse.json({ ok: true });
    if (!await claimWebhookMessage(inbound.messageId)) return NextResponse.json({ ok: true });
    try {
      if (!await claimMissionMessageSlot(session.runId)) return NextResponse.json({ ok: true });
      let questionClaim: number;
      try { questionClaim = await claimMissionQuestion(session.runId); }
      catch (error) { await releaseMissionMessageSlot(session.runId); throw error; }
      if (questionClaim < 0) {
        await releaseMissionMessageSlot(session.runId);
        return NextResponse.json({ ok: true });
      }
      const advice = questionClaim === 0 ? questionLimitMessage : await replyAdvice(inbound.text, session.publicState);
      await sendIMessage(session.spaceId, advice, session.phone);
      if (questionClaim > 0) await appendMissionAdvice(session.runId, advice);
      return NextResponse.json({ ok: true });
    } catch {
      // Keep both the webhook ID and any reserved question slot: provider retries
      // must never turn an uncertain send into duplicate advice or extra hints.
      return NextResponse.json({ error: "Mission Control reply unavailable" }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "Mission Control unavailable" }, { status: 503 });
  }
}

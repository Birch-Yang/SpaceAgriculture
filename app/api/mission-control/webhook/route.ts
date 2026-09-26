import { NextResponse } from "next/server";
import { replyAdvice } from "../../../../src/ai/advisor.ts";
import { sendIMessage } from "../../../../src/ai/spectrum.ts";
import { verifySpectrumWebhook } from "../../../../src/ai/webhookSignature.ts";
import { appendMissionAdvice, claimWebhookMessage, missionSessionBySpace, releaseWebhookMessage } from "../../../../src/backend/missionSessions.ts";

export const runtime = "nodejs";
export const maxDuration = 30;
type Inbound = { event?: unknown; space?: { id?: unknown }; message?: { id?: unknown; direction?: unknown; content?: { type?: unknown; text?: unknown } } };

export async function POST(request: Request) {
  const secret = process.env.SPECTRUM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 64_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  if (!verifySpectrumWebhook(raw, request.headers, secret)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let payload: Inbound;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (payload.event !== "messages" || payload.message?.direction !== "inbound" || payload.message.content?.type !== "text"
    || typeof payload.message.content.text !== "string" || !payload.message.content.text.trim()
    || typeof payload.message.id !== "string" || typeof payload.space?.id !== "string") return NextResponse.json({ ok: true });
  if (payload.message.content.text.length > 500) return NextResponse.json({ ok: true });
  try {
    const session = await missionSessionBySpace(payload.space.id);
    if (!session || session.outage || session.messageCount >= 25) return NextResponse.json({ ok: true });
    if (!await claimWebhookMessage(payload.message.id)) return NextResponse.json({ ok: true });
    try {
      const advice = await replyAdvice(payload.message.content.text, session.publicState);
      await sendIMessage(session.spaceId, advice, session.phone);
      await appendMissionAdvice(session.runId, advice);
      return NextResponse.json({ ok: true });
    } catch {
      await releaseWebhookMessage(payload.message.id);
      return NextResponse.json({ error: "Mission Control reply unavailable" }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "Mission Control unavailable" }, { status: 503 });
  }
}

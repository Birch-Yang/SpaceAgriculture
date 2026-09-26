import { replyAdvice } from "./advisor.ts";
import type { MissionSession } from "../backend/missionSessions.ts";

type Services = {
  claim(runId: string, turn: number): Promise<number | undefined>;
  send(session: MissionSession, text: string): Promise<void>;
  record(runId: string, text: string): Promise<void>;
};

export async function answerPhotonQuestion(session: MissionSession, question: string, turn: number, services: Services) {
  if (!question.trim() || question.length > 500)
    return { status: 400, body: { error: "Keep your transmission between 1 and 500 characters." } };
  if (session.outage || session.lastTurn < 1)
    return { status: 503, body: { error: "MISSION CONTROL LINK LOST — use local instruments until the relay reopens." } };
  if (turn !== session.lastTurn)
    return { status: 409, body: { error: "Earth is waiting for this turn's telemetry. Try again once the relay synchronizes." } };
  let used: number | undefined;
  try { used = await services.claim(session.runId, turn); }
  catch { return { status: 503, body: { error: "Mission Control could not reserve a transmission. Try again later." } }; }
  if (used === undefined)
    return { status: 429, body: { error: "Earth–Moon link budget exhausted or the relay has closed. Wait for the next turn.", used: 2, limit: 2 } };
  const advice = await replyAdvice(question, session.publicState);
  try { await services.send(session, `Photon · Earth Mission Control\n${advice}`); }
  catch { return { status: 503, body: { error: "Photon could not confirm the transmission. This attempt used one relay slot.", used, limit: 2 } }; }
  // A history write failure must not cause the already-sent message to be resent.
  let historySaved = true;
  try { await services.record(session.runId, advice); } catch { historySaved = false; }
  return { status: 200, body: { advice, used, limit: 2, delivery: "accepted", historySaved } };
}

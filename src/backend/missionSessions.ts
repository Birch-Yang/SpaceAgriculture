import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AgentPublicState } from "../ai/publicState.ts";
import { serverSupabase } from "./supabase.ts";

export type MissionSession = { runId: string; spaceId: string; phone?: string; tokenHash: string; publicState: AgentPublicState; outage: boolean; adviceHistory: string[]; lastTurn: number; messageCount: number };
const sessionHours = 2;

function secret(): string {
  const value = process.env.MISSION_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Mission Control session key is not configured");
  return value;
}

function spaceHash(id: string): string {
  return createHmac("sha256", secret()).update(id).digest("hex");
}

function key(): Buffer { return createHash("sha256").update(secret()).digest(); }

function encrypt(value: { spaceId: string; phone?: string }): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value: string): { spaceId: string; phone?: string } {
  const [iv, tag, body] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8"));
}

async function cleanup(): Promise<void> {
  const client = serverSupabase();
  if (client) await client.rpc("cleanup_mission_control");
}

function asSession(row: Record<string, unknown>): MissionSession {
  const space = decrypt(String(row.space_cipher));
  return {
    runId: String(row.run_id), ...space, tokenHash: String(row.session_token_hash), publicState: row.public_state as AgentPublicState, outage: !!row.outage,
    adviceHistory: Array.isArray(row.advice_history) ? row.advice_history.filter((item): item is string => typeof item === "string") : [],
    lastTurn: Number(row.last_turn) || 0, messageCount: Number(row.message_count) || 0,
  };
}

export function hashSessionToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }

export function validSessionToken(session: MissionSession, token: unknown): boolean {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const actual = Buffer.from(hashSessionToken(token), "hex");
  const expected = Buffer.from(session.tokenHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function claimMissionEnrollment(runId: string, requesterHash: string): Promise<boolean> {
  const client = serverSupabase();
  if (!client) return false;
  const { data, error } = await client.rpc("claim_mission_enrollment", { p_run_id: runId, p_requester_hash: requesterHash });
  return !error && data === "claimed";
}

export async function registerMissionSession(runId: string, spaceId: string, phone: string | undefined, tokenHash: string, publicState: AgentPublicState): Promise<boolean> {
  const client = serverSupabase();
  if (!client) return false;
  await cleanup();
  const hash = spaceHash(spaceId);
  await client.from("mission_control_sessions").delete().eq("space_hash", hash);
  const { error } = await client.from("mission_control_sessions").upsert({
    run_id: runId, space_hash: hash, space_cipher: encrypt({ spaceId, phone }), session_token_hash: tokenHash, public_state: publicState, outage: false,
    advice_history: [], last_turn: 0, message_count: 0,
    expires_at: new Date(Date.now() + sessionHours * 3600_000).toISOString(),
  }, { onConflict: "run_id" });
  return !error;
}

export async function missionSessionByRun(runId: string): Promise<MissionSession | undefined> {
  const client = serverSupabase();
  if (!client) return undefined;
  const { data, error } = await client.from("mission_control_sessions").select("*").eq("run_id", runId)
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  return error || !data ? undefined : asSession(data);
}

export async function missionSessionBySpace(spaceId: string): Promise<MissionSession | undefined> {
  const client = serverSupabase();
  if (!client) return undefined;
  const { data, error } = await client.from("mission_control_sessions").select("*").eq("space_hash", spaceHash(spaceId))
    .gt("expires_at", new Date().toISOString()).maybeSingle();
  return error || !data ? undefined : asSession(data);
}

export async function updateMissionSession(runId: string, publicState: AgentPublicState, turn: number, outage: boolean, advice?: string): Promise<boolean> {
  const client = serverSupabase();
  const session = await missionSessionByRun(runId);
  if (!client || !session || turn <= session.lastTurn) return false;
  const history = advice ? [...session.adviceHistory, advice].slice(-25) : session.adviceHistory;
  const { data, error } = await client.from("mission_control_sessions").update({ public_state: publicState, outage, last_turn: turn,
    advice_history: history })
    .eq("run_id", runId).eq("last_turn", session.lastTurn).select("run_id").maybeSingle();
  return !error && !!data;
}

export async function appendMissionAdvice(runId: string, advice: string): Promise<void> {
  const client = serverSupabase();
  if (client) await client.rpc("append_mission_advice", { p_run_id: runId, p_advice: advice });
}

export async function claimMissionMessageSlot(runId: string): Promise<boolean> {
  const client = serverSupabase();
  if (!client) return false;
  const { data, error } = await client.rpc("claim_mission_message", { p_run_id: runId });
  return !error && data === true;
}

export async function missionAdviceHistory(runId: string): Promise<string[]> {
  return (await missionSessionByRun(runId))?.adviceHistory ?? [];
}

export async function claimWebhookMessage(messageId: string): Promise<boolean> {
  const client = serverSupabase();
  if (!client) return false;
  await cleanup();
  const { error } = await client.from("mission_control_webhook_messages").insert({ message_id: messageId });
  return !error;
}

export async function releaseWebhookMessage(messageId: string): Promise<void> {
  const client = serverSupabase();
  if (client) await client.from("mission_control_webhook_messages").delete().eq("message_id", messageId);
}

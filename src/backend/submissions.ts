import { createHash, createHmac } from "node:crypto";
import type { EvaluationResult } from "../ai/schemas.ts";
import type { MissionReport } from "../ai/report.ts";
import type { RunTranscript } from "../game/state/transcript.ts";
import { serverSupabase } from "./supabase.ts";

export type CachedResult = { evaluation?: EvaluationResult; report: MissionReport };

export function requesterHash(request: Request): string {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const secret = process.env.SUBMISSION_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "local-only";
  return createHmac("sha256", secret).update(address).digest("hex");
}

export function transcriptHash(transcript: RunTranscript): string {
  return createHash("sha256").update(JSON.stringify(transcript)).digest("hex");
}

export async function claimSubmission(runId: string, transcript: RunTranscript, request: Request): Promise<"claimed" | "duplicate" | "conflict" | "rate_limited" | "unavailable"> {
  const client = serverSupabase();
  if (!client) return "unavailable";
  const { data, error } = await client.rpc("claim_run_submission", { p_run_id: runId, p_requester_hash: requesterHash(request), p_transcript_hash: transcriptHash(transcript) });
  if (error) return "unavailable";
  return data === "claimed" || data === "duplicate" || data === "conflict" || data === "rate_limited" ? data : "unavailable";
}

export async function getSubmission(runId: string): Promise<{ result?: CachedResult; saved: boolean } | undefined> {
  const client = serverSupabase();
  if (!client) return undefined;
  const { data, error } = await client.from("run_submission_claims").select("result_json,saved").eq("run_id", runId).maybeSingle();
  if (error || !data) return undefined;
  return { result: data.result_json as CachedResult | undefined, saved: !!data.saved };
}

export async function cacheSubmission(runId: string, result: CachedResult, saved: boolean): Promise<void> {
  const client = serverSupabase();
  if (!client) return;
  await client.from("run_submission_claims").update({ result_json: result, saved }).eq("run_id", runId);
}

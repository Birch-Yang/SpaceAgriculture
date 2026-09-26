import { NextResponse } from "next/server";
import { getReport } from "../../../../src/backend/runs.ts";
import { createReplayFrames } from "../../../../src/game/state/replayFrames.ts";
import { parseTranscript } from "../../../../src/game/state/transcript.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  if (!uuid.test(runId)) return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  try {
    const run = await getReport(runId);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    const stored = run.summary_json as { replay?: { transcript?: unknown } } | null;
    if (!stored?.replay?.transcript) return NextResponse.json({ error: "Replay not available for this run" }, { status: 404 });
    const transcript = parseTranscript(stored.replay.transcript);
    const frames = createReplayFrames(transcript);
    return NextResponse.json({ version: 1, runId, mode: transcript.mode, frames }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=3600" } });
  } catch { return NextResponse.json({ error: "Replay unavailable" }, { status: 503 }); }
}

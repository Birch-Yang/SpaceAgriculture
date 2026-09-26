import { NextResponse } from "next/server";
import { getReport } from "../../../../src/backend/runs.ts";

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  try {
    const run = await getReport(runId);
    return run ? NextResponse.json(run) : NextResponse.json({ error: "Report not found" }, { status: 404 });
  } catch { return NextResponse.json({ error: "Report unavailable" }, { status: 503 }); }
}

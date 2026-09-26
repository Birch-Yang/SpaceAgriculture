import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, type LeaderboardCategory } from "../../../src/backend/runs.ts";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? "overall";
  if (!["overall", "production", "stability", "efficiency", "resilience"].includes(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  const runId = request.nextUrl.searchParams.get("runId") ?? undefined;
  if (runId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  try { return NextResponse.json({ category, ...await getLeaderboard(category as LeaderboardCategory, 20, runId) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === "Supabase public access is not configured"
    ? "Records need Supabase project URL and publishable key. See setup guide." : "Leaderboard unavailable" }, { status: 503 }); }
}

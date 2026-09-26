import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, type LeaderboardCategory } from "../../../src/backend/runs.ts";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? "overall";
  if (!["overall", "production", "stability", "efficiency", "resilience"].includes(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  try { return NextResponse.json({ category, rows: await getLeaderboard(category as LeaderboardCategory) }); }
  catch { return NextResponse.json({ error: "Leaderboard unavailable" }, { status: 503 }); }
}

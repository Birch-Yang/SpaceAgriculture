import { NextResponse } from "next/server";
import { getAggregateAnalytics } from "../../../src/backend/analytics.ts";

export async function GET() {
  try { return NextResponse.json(await getAggregateAnalytics()); }
  catch { return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 }); }
}

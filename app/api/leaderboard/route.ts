import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitValue = Number(searchParams.get("limit") ?? "10");
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 10;

    const { leaderboard } = await getCollections();
    const entries = await leaderboard
      .find({}, { projection: { _id: 0 } })
      .sort({ bestScore: -1, avgWpm: -1, avgAccuracy: -1, updatedAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(entries);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch leaderboard.";
    const status = /Missing MONGODB_URI/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

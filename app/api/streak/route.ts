import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/server/db";
import { requireSessionIdentity } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    void req;
    const identity = await requireSessionIdentity();

    const { streaks } = await getCollections();
    const streak = await streaks.findOne({ userId: identity.userId });

    return NextResponse.json(
      streak ?? {
        userId: identity.userId,
        username: identity.username,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDateUtc: null,
        updatedAt: null,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch streak.";
    const status = /Unauthorized/.test(message) ? 401 : /required|Missing MONGODB_URI/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

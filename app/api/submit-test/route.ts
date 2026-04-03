import { NextRequest, NextResponse } from "next/server";
import type { SessionResult } from "@/lib/stores/analytics";
import { submitTest } from "@/lib/server/db";
import { requireSessionIdentity } from "@/lib/server/session";
import { enqueueJob } from "@/lib/queue";

export const runtime = "nodejs";

interface SubmitTestRequest {
  session?: SessionResult;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmitTestRequest;
    if (!body.session) {
      return NextResponse.json({ error: "session is required." }, { status: 400 });
    }

    const identity = await requireSessionIdentity();
    const result   = await submitTest({
      userId:   identity.userId,
      username: identity.username,
      session:  body.session,
    });

    // ── Phase 2: fire-and-forget background jobs ──────────────────────────
    // Pre-warm a drill cache so the analytics page can show it instantly.
    void enqueueJob("generate-drill-cache", {
      userId:     identity.userId,
      weakKeys:   result.weakKeys.slice(0, 5).map((k) => k.key),
      slowBigrams: [],
      currentWpm: body.session.wpm,
    });

    // Recalculate leaderboard ranks asynchronously.
    void enqueueJob("update-leaderboard", { userId: identity.userId });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit test.";
    const status  = /Unauthorized/.test(message) ? 401 : /required|Missing MONGODB_URI/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

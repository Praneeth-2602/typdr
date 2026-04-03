import { NextRequest, NextResponse } from "next/server";
import type { SessionResult } from "@/lib/stores/analytics";
import { analyzeSession } from "@/lib/server/db";
import { requireSessionIdentity } from "@/lib/server/session";

export const runtime = "nodejs";

interface AnalyzeTestRequest {
  session?: SessionResult;
}

export async function POST(req: NextRequest) {
  try {
    await requireSessionIdentity();
    const body = (await req.json()) as AnalyzeTestRequest;

    if (!body.session) {
      return NextResponse.json({ error: "session is required." }, { status: 400 });
    }

    return NextResponse.json(analyzeSession(body.session));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze test.";
    const status = /Unauthorized/.test(message) ? 401 : /required/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

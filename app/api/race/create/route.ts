import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/server/race";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const room = await createRoom({
      userId,
      username: username || "Host",
    });

    return NextResponse.json(room);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create race room.";
    const status = /Missing MONGODB_URI/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  getRoom,
  joinRoom,
  updateProgress,
  startCountdown,
  markFinished,
  rematch,
} from "@/lib/server/race";

export const runtime = "nodejs";

type Ctx = { params: { code: string } };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const room = await getRoom(ctx.params.code);
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    return NextResponse.json(room);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch room.";
    const status = /Missing MONGODB_URI/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const code = ctx.params.code;
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "Guest";

    if (!action) {
      return NextResponse.json({ error: "action is required." }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    let room;
    switch (action) {
      case "join":
        room = await joinRoom(code, { userId, username });
        break;
      case "progress":
        room = await updateProgress(code, userId, {
          progress: Number(body.progress) || 0,
          wpm: Number(body.wpm) || 0,
          accuracy: Number(body.accuracy) || 100,
        });
        break;
      case "start":
        room = await startCountdown(code, userId);
        break;
      case "finish":
        room = await markFinished(code, userId, {
          wpm: Number(body.wpm) || 0,
          accuracy: Number(body.accuracy) || 100,
          progress: body.progress != null ? Number(body.progress) : undefined,
        });
        break;
      case "rematch":
        room = await rematch(code, userId);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(room);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Race action failed.";
    const status =
      /not found/i.test(message) ? 404
      : /Missing MONGODB_URI/.test(message) ? 400
      : /Only the host|already started|full|not in this room|not in progress/i.test(message) ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

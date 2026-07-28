// ─────────────────────────────────────────────────────────────────────────────
// lib/server/race.ts
//
// Polling-based multiplayer race rooms (MongoDB). Works on Vercel serverless.
// ─────────────────────────────────────────────────────────────────────────────

import type { Collection } from "mongodb";
import { getMongoDb } from "@/lib/server/db";
import { generateWordTest } from "@/lib/data/corpus";

export const MAX_RACE_PLAYERS = 8;
export const COUNTDOWN_MS = 3000;
export const ROOM_EXPIRE_AFTER_FINISH_MS = 5 * 60 * 1000;
const LOBBY_TTL_MS = 30 * 60 * 1000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface RacePlayer {
  userId: string;
  username: string;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  finishedAt?: number;
}

export interface RaceRoom {
  code: string;
  text: string;
  status: "waiting" | "countdown" | "racing" | "finished";
  players: RacePlayer[];
  hostId: string;
  countdownEndsAt?: number;
  createdAt: number;
  expiresAt: number;
}

export type RaceRoomDoc = RaceRoom;

function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

let raceIndexesReady = false;

export async function getRaceRooms(): Promise<Collection<RaceRoom>> {
  const db = await getMongoDb();
  const raceRooms = db.collection<RaceRoom>("raceRooms");

  if (!raceIndexesReady) {
    await Promise.all([
      raceRooms.createIndex({ code: 1 }, { unique: true }),
      raceRooms.createIndex({ expiresAt: 1 }),
    ]);
    raceIndexesReady = true;
  }

  return raceRooms;
}

function sanitizeUsername(name: string): string {
  return name.trim().slice(0, 24) || "Guest";
}

async function uniqueCode(col: Collection<RaceRoom>): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateCode();
    const existing = await col.findOne({ code }, { projection: { code: 1 } });
    if (!existing) return code;
  }
  throw new Error("Could not allocate a unique room code.");
}

/** Transition countdown → racing (or finished expiry) when timestamps pass. */
export async function refreshRoomStatus(room: RaceRoom): Promise<RaceRoom> {
  const now = Date.now();
  const col = await getRaceRooms();

  if (room.status === "countdown" && room.countdownEndsAt && now >= room.countdownEndsAt) {
    await col.updateOne({ code: room.code }, { $set: { status: "racing" }, $unset: { countdownEndsAt: "" } });
    const { countdownEndsAt: _, ...rest } = room;
    return { ...rest, status: "racing" };
  }

  return room;
}

export async function createRoom(host: { userId: string; username: string }): Promise<RaceRoom> {
  const col = await getRaceRooms();
  const code = await uniqueCode(col);
  const now = Date.now();

  const room: RaceRoom = {
    code,
    text: generateWordTest(40),
    status: "waiting",
    players: [
      {
        userId: host.userId,
        username: sanitizeUsername(host.username),
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
      },
    ],
    hostId: host.userId,
    createdAt: now,
    expiresAt: now + LOBBY_TTL_MS,
  };

  await col.insertOne({ ...room });
  return room;
}

export async function getRoom(code: string): Promise<RaceRoom | null> {
  const col = await getRaceRooms();
  const room = await col.findOne({ code: code.toUpperCase() });
  if (!room) return null;
  if (room.expiresAt < Date.now()) {
    await col.deleteOne({ code: room.code });
    return null;
  }
  const refreshed = await refreshRoomStatus(room);
  return stripId(refreshed);
}

export async function joinRoom(
  code: string,
  player: { userId: string; username: string }
): Promise<RaceRoom> {
  const col = await getRaceRooms();
  const found = await col.findOne({ code: code.toUpperCase() });
  if (!found) throw new Error("Room not found.");
  const current = await refreshRoomStatus(found);

  if (current.status !== "waiting") {
    throw new Error("Race already started.");
  }

  const existing = current.players.find((p) => p.userId === player.userId);
  if (existing) {
    return stripId(current);
  }

  if (current.players.length >= MAX_RACE_PLAYERS) {
    throw new Error("Room is full (max 8 players).");
  }

  const nextPlayer: RacePlayer = {
    userId: player.userId,
    username: sanitizeUsername(player.username),
    progress: 0,
    wpm: 0,
    accuracy: 100,
    finished: false,
  };

  await col.updateOne(
    { code: current.code },
    { $push: { players: nextPlayer } }
  );

  return { ...stripId(current), players: [...current.players, nextPlayer] };
}

export async function updateProgress(
  code: string,
  userId: string,
  data: { progress: number; wpm: number; accuracy: number }
): Promise<RaceRoom> {
  const col = await getRaceRooms();
  const found = await col.findOne({ code: code.toUpperCase() });
  if (!found) throw new Error("Room not found.");
  const room = await refreshRoomStatus(found);

  if (room.status === "countdown") {
    return stripId(room);
  }
  if (room.status !== "racing") {
    throw new Error("Race is not in progress.");
  }

  const idx = room.players.findIndex((p) => p.userId === userId);
  if (idx === -1) throw new Error("You are not in this room.");
  if (room.players[idx].finished) return stripId(room);

  const progress = Math.max(0, Math.min(data.progress, room.text.length));
  const wpm = Math.max(0, Math.min(999, Math.round(data.wpm)));
  const accuracy = Math.max(0, Math.min(100, Math.round(data.accuracy)));

  const players = room.players.map((p, i) =>
    i === idx ? { ...p, progress, wpm, accuracy } : p
  );

  await col.updateOne(
    { code: room.code },
    { $set: { [`players.${idx}.progress`]: progress, [`players.${idx}.wpm`]: wpm, [`players.${idx}.accuracy`]: accuracy } }
  );

  return { ...stripId(room), players };
}

export async function startCountdown(code: string, requesterId: string): Promise<RaceRoom> {
  const col = await getRaceRooms();
  const room = await col.findOne({ code: code.toUpperCase() });
  if (!room) throw new Error("Room not found.");
  if (room.hostId !== requesterId) throw new Error("Only the host can start the race.");
  if (room.status !== "waiting") throw new Error("Race already started.");
  if (room.players.length < 1) throw new Error("Need at least one player.");

  const countdownEndsAt = Date.now() + COUNTDOWN_MS;
  await col.updateOne(
    { code: room.code },
    { $set: { status: "countdown", countdownEndsAt } }
  );

  return {
    ...stripId(room),
    status: "countdown",
    countdownEndsAt,
  };
}

export async function markFinished(
  code: string,
  userId: string,
  data: { wpm: number; accuracy: number; progress?: number }
): Promise<RaceRoom> {
  const col = await getRaceRooms();
  const found = await col.findOne({ code: code.toUpperCase() });
  if (!found) throw new Error("Room not found.");
  const room = await refreshRoomStatus(found);

  if (room.status !== "racing" && room.status !== "finished") {
    throw new Error("Race is not in progress.");
  }

  const idx = room.players.findIndex((p) => p.userId === userId);
  if (idx === -1) throw new Error("You are not in this room.");

  const now = Date.now();
  const textLen = room.text.length;
  const players = room.players.map((p, i) => {
    if (i !== idx) return p;
    if (p.finished) return p;
    return {
      ...p,
      progress: data.progress ?? textLen,
      wpm: Math.max(0, Math.min(999, Math.round(data.wpm))),
      accuracy: Math.max(0, Math.min(100, Math.round(data.accuracy))),
      finished: true,
      finishedAt: now,
    };
  });

  const allFinished = players.every((p) => p.finished);
  const expiresAt = allFinished ? now + ROOM_EXPIRE_AFTER_FINISH_MS : room.expiresAt;
  const status = allFinished ? "finished" : room.status === "finished" ? "finished" : "racing";

  await col.updateOne(
    { code: room.code },
    {
      $set: {
        players,
        status,
        expiresAt,
      },
    }
  );

  return { ...stripId(room), players, status, expiresAt };
}

export async function rematch(code: string, requesterId: string): Promise<RaceRoom> {
  const col = await getRaceRooms();
  const room = await col.findOne({ code: code.toUpperCase() });
  if (!room) throw new Error("Room not found.");
  if (room.hostId !== requesterId) throw new Error("Only the host can rematch.");

  const now = Date.now();
  const players = room.players.map((p) => ({
    userId: p.userId,
    username: p.username,
    progress: 0,
    wpm: 0,
    accuracy: 100,
    finished: false,
  }));

  const next: RaceRoom = {
    code: room.code,
    text: generateWordTest(40),
    status: "waiting",
    players,
    hostId: room.hostId,
    createdAt: room.createdAt,
    expiresAt: now + LOBBY_TTL_MS,
  };

  await col.updateOne(
    { code: room.code },
    {
      $set: {
        text: next.text,
        status: "waiting",
        players,
        expiresAt: next.expiresAt,
      },
      $unset: { countdownEndsAt: "" },
    }
  );

  return next;
}

function stripId(room: RaceRoom & { _id?: unknown }): RaceRoom {
  const { _id: _, ...rest } = room;
  return rest;
}

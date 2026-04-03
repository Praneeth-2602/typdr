// ─────────────────────────────────────────────────────────────────────────────
// lib/server/db.ts
//
// All Next.js API routes that import this file MUST declare:
//   export const runtime = "nodejs";
//
// MongoDB's native driver requires the Node.js runtime.
// The Edge runtime does not support TCP connections.
// ─────────────────────────────────────────────────────────────────────────────

import { MongoClient, type Collection, type Db } from "mongodb";
import type { KeystrokeEvent, SessionResult, StreakInfo, WeakKeyStat } from "@/lib/stores/analytics";
import { generateCoachFeedback } from "@/lib/utils/feedback";

interface MongoKeyStat {
  attempts: number;
  correct: number;
  totalLatency: number;
  latencySamples: number;
}

export interface UserStatsDocument {
  userId: string;
  username: string;
  keyStats: Record<string, MongoKeyStat>;
  sessionsCompleted: number;
  // ── Phase 2: Gamification ─────────────────────────────────────────────────
  xp: number;
  level: number;
  updatedAt: Date;
}

// ── XP / Level helpers (Phase 2) ──────────────────────────────────────────
// Level thresholds grow by 15 % per level, starting at 100 XP for level 1→2.
export const XP_BASE = 100;
export const XP_GROWTH = 1.15;

export function xpForLevel(level: number): number {
  // Total XP required to *reach* `level` (level 1 = 0 XP)
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += Math.round(XP_BASE * Math.pow(XP_GROWTH, l - 1));
  }
  return total;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function xpGainedForSession(session: { wpm: number; accuracy: number; consistency: number }): number {
  // xp = wpm * accuracy * 0.1, bonus for consistency ≥ 80
  const base = Math.round(session.wpm * (session.accuracy / 100) * 0.1 * 10) / 10;
  const consistencyBonus = session.consistency >= 80 ? Math.round(base * 0.1) : 0;
  return Math.max(1, Math.round(base + consistencyBonus));
}

export interface XpGainResult {
  xpGained: number;
  xpTotal: number;
  level: number;
  leveledUp: boolean;
  prevLevel: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
}

export interface UserStreakDocument extends StreakInfo {
  userId: string;
  username: string;
  updatedAt: Date;
}

export interface LeaderboardDocument {
  userId: string;
  username: string;
  bestScore: number;
  avgWpm: number;
  avgAccuracy: number;
  testsCompleted: number;
  updatedAt: Date;
}

export interface SessionDocument {
  userId: string;
  username: string;
  session: SessionResult;
  createdAt: Date;
}

export interface SubmitTestPayload {
  userId: string;
  username?: string;
  session: SessionResult;
}

export interface AnalyzeTestResult {
  feedback: string[];
  weakKeys: WeakKeyStat[];
  strongKeys: WeakKeyStat[];
}

const WEAK_KEY_PATTERN = /[a-z,./;']/;

// ── Mongo singleton ────────────────────────────────────────────────────────
// We use a global variable so the promise survives Next.js hot-module reloads
// in development (where modules are re-evaluated on every request).
declare global {
  // eslint-disable-next-line no-var
  var __swiftkeysMongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoConfig() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "swiftkeys";

  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. " +
        "Add it to .env.local (locally) or your hosting provider's environment settings. " +
        "Get a free MongoDB Atlas cluster at https://cloud.mongodb.com"
    );
  }

  return { uri, dbName };
}

export async function getMongoDb(): Promise<Db> {
  const { uri, dbName } = getMongoConfig();

  if (!global.__swiftkeysMongoClientPromise) {
    const client = new MongoClient(uri, {
      // Prevent the connection from being treated as stale after the
      // Lambda/serverless function is paused between requests.
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    global.__swiftkeysMongoClientPromise = client.connect();
  }

  const client = await global.__swiftkeysMongoClientPromise;
  return client.db(dbName);
}

export async function getCollections() {
  const db = await getMongoDb();

  const sessions    = db.collection<SessionDocument>("test_sessions");
  const userStats   = db.collection<UserStatsDocument>("user_stats");
  const streaks     = db.collection<UserStreakDocument>("user_streaks");
  const leaderboard = db.collection<LeaderboardDocument>("leaderboard");

  await ensureIndexes(sessions, userStats, streaks, leaderboard);

  return { db, sessions, userStats, streaks, leaderboard };
}

// Only run index creation once per process
let indexesReady = false;

async function ensureIndexes(
  sessions:     Collection<SessionDocument>,
  userStats:    Collection<UserStatsDocument>,
  streaks:      Collection<UserStreakDocument>,
  leaderboard:  Collection<LeaderboardDocument>
) {
  if (indexesReady) return;

  await Promise.all([
    sessions.createIndex({ userId: 1, "session.timestamp": -1 }),
    userStats.createIndex({ userId: 1 }, { unique: true }),
    streaks.createIndex({ userId: 1 }, { unique: true }),
    leaderboard.createIndex({ bestScore: -1, avgWpm: -1 }),
    leaderboard.createIndex({ userId: 1 }, { unique: true }),
  ]);

  indexesReady = true;
}

// ── Date helpers ───────────────────────────────────────────────────────────
function getUtcDateLabel(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function diffUtcDays(a: string, b: string): number {
  const aMs = Date.parse(`${a}T00:00:00.000Z`);
  const bMs = Date.parse(`${b}T00:00:00.000Z`);
  return Math.round((aMs - bMs) / 86400000);
}

// ── Streak helpers ─────────────────────────────────────────────────────────
function createEmptyStreak(userId: string, username: string): UserStreakDocument {
  return {
    userId,
    username,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDateUtc: null,
    updatedAt: new Date(),
  };
}

function updateStreakDocument(
  current: UserStreakDocument | null,
  userId: string,
  username: string,
  timestamp: number
): UserStreakDocument {
  const base = current ?? createEmptyStreak(userId, username);
  const todayUtc = getUtcDateLabel(timestamp);

  // Already recorded activity today — just refresh username
  if (base.lastActiveDateUtc === todayUtc) {
    return { ...base, username, updatedAt: new Date() };
  }

  let currentStreak = 1;
  if (base.lastActiveDateUtc) {
    const dayGap = diffUtcDays(todayUtc, base.lastActiveDateUtc);
    currentStreak = dayGap === 1 ? base.currentStreak + 1 : 1;
  }

  return {
    ...base,
    username,
    currentStreak,
    longestStreak: Math.max(base.longestStreak, currentStreak),
    lastActiveDateUtc: todayUtc,
    updatedAt: new Date(),
  };
}

// ── Key stat helpers ───────────────────────────────────────────────────────
function createEmptyUserStats(userId: string, username: string): UserStatsDocument {
  return {
    userId,
    username,
    keyStats: {},
    sessionsCompleted: 0,
    xp: 0,
    level: 1,
    updatedAt: new Date(),
  };
}

function mergeKeyStats(
  existing: Record<string, MongoKeyStat>,
  keystrokeLog: KeystrokeEvent[]
): Record<string, MongoKeyStat> {
  const next = { ...existing };

  for (const event of keystrokeLog) {
    const key = event.expectedChar.toLowerCase();
    if (key.length !== 1 || !WEAK_KEY_PATTERN.test(key)) continue;

    const current = next[key] ?? {
      attempts: 0,
      correct: 0,
      totalLatency: 0,
      latencySamples: 0,
    };

    current.attempts += 1;
    if (event.correct) current.correct += 1;

    if (
      typeof event.latencyMs === "number" &&
      event.latencyMs > 0 &&
      event.latencyMs < 2000
    ) {
      current.totalLatency += event.latencyMs;
      current.latencySamples += 1;
    }

    next[key] = current;
  }

  return next;
}

// ── Weak / strong key computation ─────────────────────────────────────────
export function computeWeakKeyStats(
  keyStats: Record<string, MongoKeyStat>,
  limit = 5
): WeakKeyStat[] {
  const rows = Object.entries(keyStats)
    .filter(
      ([key, stat]) =>
        key.length === 1 &&
        WEAK_KEY_PATTERN.test(key) &&
        stat.attempts >= 3
    )
    .map(([key, stat]) => ({
      key,
      attempts: stat.attempts,
      accuracyRaw: stat.correct / stat.attempts,
      avgLatencyRaw:
        stat.latencySamples > 0
          ? stat.totalLatency / stat.latencySamples
          : 0,
    }));

  if (!rows.length) return [];

  const latencies = rows.map((r) => r.avgLatencyRaw);
  const minL = Math.min(...latencies);
  const maxL = Math.max(...latencies);
  const rangeL = maxL - minL;

  return rows
    .map((row) => {
      const normL =
        row.avgLatencyRaw <= 0
          ? 0
          : rangeL === 0
          ? 0.5
          : (row.avgLatencyRaw - minL) / rangeL;

      const weaknessScore = (1 - row.accuracyRaw) * 0.7 + normL * 0.3;

      return {
        key: row.key,
        attempts: row.attempts,
        accuracy: Math.round(row.accuracyRaw * 100),
        avgLatency: Math.round(row.avgLatencyRaw),
        weaknessScore: Math.round(weaknessScore * 1000) / 1000,
      };
    })
    .sort((a, b) => {
      if (b.weaknessScore !== a.weaknessScore) return b.weaknessScore - a.weaknessScore;
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.avgLatency - a.avgLatency;
    })
    .slice(0, limit);
}

export function computeStrongKeyStats(
  keyStats: Record<string, MongoKeyStat>,
  limit = 5
): WeakKeyStat[] {
  return [...computeWeakKeyStats(keyStats, 100)]
    .sort((a, b) => {
      if (a.weaknessScore !== b.weaknessScore) return a.weaknessScore - b.weaknessScore;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return a.avgLatency - b.avgLatency;
    })
    .slice(0, limit);
}

// ── Session analysis ───────────────────────────────────────────────────────
export function analyzeSession(session: SessionResult): AnalyzeTestResult {
  const sessionKeyStats: Record<string, MongoKeyStat> = {};

  for (const event of session.keystrokeLog ?? []) {
    const key = event.expectedChar.toLowerCase();
    if (key.length !== 1 || !WEAK_KEY_PATTERN.test(key)) continue;

    const current = sessionKeyStats[key] ?? {
      attempts: 0,
      correct: 0,
      totalLatency: 0,
      latencySamples: 0,
    };

    current.attempts += 1;
    if (event.correct) current.correct += 1;
    if (
      typeof event.latencyMs === "number" &&
      event.latencyMs > 0 &&
      event.latencyMs < 2000
    ) {
      current.totalLatency += event.latencyMs;
      current.latencySamples += 1;
    }

    sessionKeyStats[key] = current;
  }

  const weakKeys   = computeWeakKeyStats(sessionKeyStats, 5);
  const strongKeys = computeStrongKeyStats(sessionKeyStats, 5);
  const feedback   = generateCoachFeedback({
    wpm: session.wpm,
    rawWpm: session.rawWpm,
    accuracy: session.accuracy,
    consistency: session.consistency,
    errorCount: session.incorrectChars,
    weakKeys,
  });

  return { feedback, weakKeys, strongKeys };
}

// ── Identity helpers ───────────────────────────────────────────────────────
function sanitizeUsername(userId: string, username?: string) {
  return (username?.trim() || userId.trim() || "anonymous").slice(0, 40);
}

export function parseIdentity(input: { userId?: string; username?: string }) {
  const userId = input.userId?.trim();
  if (!userId) throw new Error("userId is required.");
  return { userId, username: sanitizeUsername(userId, input.username) };
}

// ── Main submit function ───────────────────────────────────────────────────
function normalizeScore(score: number) {
  return Math.round(score * 10) / 10;
}

export async function submitTest(payload: SubmitTestPayload) {
  const identity = parseIdentity(payload);
  const { sessions, userStats, streaks, leaderboard } = await getCollections();

  // Guarantee required fields exist even if client sends an older session shape
  const normalizedSession: SessionResult = {
    ...payload.session,
    feedback:      payload.session.feedback      ?? [],
    keystrokeLog:  payload.session.keystrokeLog  ?? [],
    score: normalizeScore(
      payload.session.score ??
        payload.session.wpm * (payload.session.accuracy / 100)
    ),
  };

  // 1. Persist the session
  await sessions.insertOne({
    userId:    identity.userId,
    username:  identity.username,
    session:   normalizedSession,
    createdAt: new Date(),
  });

  // 2. Update cumulative key stats + XP/level
  const existingStats = await userStats.findOne({ userId: identity.userId });
  const mergedKeyStats = mergeKeyStats(
    existingStats?.keyStats ?? {},
    normalizedSession.keystrokeLog
  );

  // ── XP calculation (Phase 2) ──────────────────────────────────────────────
  const prevXp    = existingStats?.xp    ?? 0;
  const prevLevel = existingStats?.level ?? 1;
  const xpGained  = xpGainedForSession({
    wpm:         normalizedSession.wpm,
    accuracy:    normalizedSession.accuracy,
    consistency: normalizedSession.consistency,
  });
  const newXp     = prevXp + xpGained;
  const newLevel  = levelFromXp(newXp);

  const xpResult: XpGainResult = {
    xpGained,
    xpTotal:           newXp,
    level:             newLevel,
    leveledUp:         newLevel > prevLevel,
    prevLevel,
    xpForCurrentLevel: xpForLevel(newLevel),
    xpForNextLevel:    xpForLevel(newLevel + 1),
  };

  const nextStats: UserStatsDocument = {
    userId:            identity.userId,
    username:          identity.username,
    keyStats:          mergedKeyStats,
    sessionsCompleted: (existingStats?.sessionsCompleted ?? 0) + 1,
    xp:                newXp,
    level:             newLevel,
    updatedAt:         new Date(),
  };
  await userStats.updateOne(
    { userId: identity.userId },
    { $set: nextStats },
    { upsert: true }
  );

  // 3. Update streak
  const existingStreak = await streaks.findOne({ userId: identity.userId });
  const nextStreak = updateStreakDocument(
    existingStreak,
    identity.userId,
    identity.username,
    normalizedSession.timestamp
  );
  await streaks.updateOne(
    { userId: identity.userId },
    { $set: nextStreak },
    { upsert: true }
  );

  // 4. Update leaderboard (rolling average)
  const existingLB = await leaderboard.findOne({ userId: identity.userId });
  const testsCompleted = (existingLB?.testsCompleted ?? 0) + 1;
  const avgWpm = (
    ((existingLB?.avgWpm ?? 0) * (testsCompleted - 1) + normalizedSession.wpm) /
    testsCompleted
  );
  const avgAccuracy = (
    ((existingLB?.avgAccuracy ?? 0) * (testsCompleted - 1) + normalizedSession.accuracy) /
    testsCompleted
  );

  const nextLB: LeaderboardDocument = {
    userId:       identity.userId,
    username:     identity.username,
    bestScore:    Math.max(existingLB?.bestScore ?? 0, normalizedSession.score),
    avgWpm:       Math.round(avgWpm * 10) / 10,
    avgAccuracy:  Math.round(avgAccuracy * 10) / 10,
    testsCompleted,
    updatedAt:    new Date(),
  };
  await leaderboard.updateOne(
    { userId: identity.userId },
    { $set: nextLB },
    { upsert: true }
  );

  // 5. Analyze the session for immediate feedback
  const analysis   = analyzeSession(normalizedSession);
  const weakKeys   = computeWeakKeyStats(mergedKeyStats, 5);
  const strongKeys = computeStrongKeyStats(mergedKeyStats, 5);

  return {
    weakKeys,
    strongKeys,
    feedback: analysis.feedback,
    streak:      nextStreak,
    leaderboard: nextLB,
    xp:          xpResult,
  };
}

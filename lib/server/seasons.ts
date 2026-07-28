import type { Collection } from "mongodb";
import {
  getCollections,
  type SeasonDocument,
  type SeasonScoreDocument,
} from "@/lib/server/db";

export type SeasonRank =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Diamond"
  | "Champion";

export type { SeasonDocument, SeasonScoreDocument };

export interface SeasonLeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  rank: number;
  tier: SeasonRank;
}

const MAX_POINTS_PER_SESSION = 200;
const MAX_SESSIONS_PER_DAY = 3;

export function seasonLabelFromDate(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function seasonNameFromLabel(label: string): string {
  const [y, m] = label.split("-").map(Number);
  if (!y || !m) return label;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthBounds(label: string): { startAt: Date; endAt: Date } {
  const [y, m] = label.split("-").map(Number);
  const startAt = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endAt = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)); // exclusive
  return { startAt, endAt };
}

export function daysRemainingInSeason(date = new Date()): number {
  const label = seasonLabelFromDate(date);
  const { endAt } = monthBounds(label);
  const ms = endAt.getTime() - date.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function tierFromPoints(points: number): SeasonRank {
  if (points >= 5000) return "Champion";
  if (points >= 2500) return "Diamond";
  if (points >= 1000) return "Gold";
  if (points >= 400) return "Silver";
  return "Bronze";
}

export function pointsForSession(wpm: number, accuracy: number): number {
  const raw = Math.round(wpm * (accuracy / 100));
  return Math.min(MAX_POINTS_PER_SESSION, Math.max(0, raw));
}

export async function getCurrentSeason(
  seasons?: Collection<SeasonDocument>
): Promise<SeasonDocument> {
  const col = seasons ?? (await getCollections()).seasons;
  const label = seasonLabelFromDate();
  const existing = await col.findOne({ label });
  if (existing) return existing;

  const { startAt, endAt } = monthBounds(label);
  const doc: SeasonDocument = {
    label,
    name: seasonNameFromLabel(label),
    startAt,
    endAt,
    archived: false,
    createdAt: new Date(),
  };
  await col.updateOne({ label }, { $setOnInsert: doc }, { upsert: true });
  return (await col.findOne({ label })) ?? doc;
}

function utcDateLabel(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Award season points for a submitted session.
 * Caps points per session and counts at most 3 sessions per UTC day.
 */
export async function addSeasonPoints(input: {
  userId: string;
  username: string;
  wpm: number;
  accuracy: number;
}): Promise<{
  awarded: number;
  totalPoints: number;
  skipped: boolean;
  reason?: string;
  seasonLabel: string;
  tier: SeasonRank;
}> {
  const { seasons, seasonScores } = await getCollections();
  const season = await getCurrentSeason(seasons);
  const points = pointsForSession(input.wpm, input.accuracy);
  const day = utcDateLabel();

  const existing = await seasonScores.findOne({
    seasonLabel: season.label,
    userId: input.userId,
  });

  const dayCount = existing?.dailyCounts?.[day] ?? 0;
  if (dayCount >= MAX_SESSIONS_PER_DAY) {
    return {
      awarded: 0,
      totalPoints: existing?.points ?? 0,
      skipped: true,
      reason: `Daily season cap reached (${MAX_SESSIONS_PER_DAY} sessions).`,
      seasonLabel: season.label,
      tier: tierFromPoints(existing?.points ?? 0),
    };
  }

  const nextDaily = { ...(existing?.dailyCounts ?? {}), [day]: dayCount + 1 };
  const totalPoints = (existing?.points ?? 0) + points;

  await seasonScores.updateOne(
    { seasonLabel: season.label, userId: input.userId },
    {
      $set: {
        seasonLabel: season.label,
        userId: input.userId,
        username: input.username,
        points: totalPoints,
        sessionsCounted: (existing?.sessionsCounted ?? 0) + 1,
        dailyCounts: nextDaily,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    awarded: points,
    totalPoints,
    skipped: false,
    seasonLabel: season.label,
    tier: tierFromPoints(totalPoints),
  };
}

export async function getSeasonLeaderboard(
  limit = 20,
  userId?: string
): Promise<{
  season: SeasonDocument;
  daysRemaining: number;
  entries: SeasonLeaderboardEntry[];
  userRank: SeasonLeaderboardEntry | null;
}> {
  const { seasons, seasonScores } = await getCollections();
  const season = await getCurrentSeason(seasons);

  const top = await seasonScores
    .find({ seasonLabel: season.label }, { projection: { _id: 0 } })
    .sort({ points: -1, updatedAt: 1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .toArray();

  const entries: SeasonLeaderboardEntry[] = top.map((row, i) => ({
    userId: row.userId,
    username: row.username,
    points: row.points,
    rank: i + 1,
    tier: tierFromPoints(row.points),
  }));

  let userRank: SeasonLeaderboardEntry | null =
    (userId && entries.find((e) => e.userId === userId)) || null;

  if (userId && !userRank) {
    const mine = await seasonScores.findOne({
      seasonLabel: season.label,
      userId,
    });
    if (mine) {
      const better = await seasonScores.countDocuments({
        seasonLabel: season.label,
        points: { $gt: mine.points },
      });
      userRank = {
        userId: mine.userId,
        username: mine.username,
        points: mine.points,
        rank: better + 1,
        tier: tierFromPoints(mine.points),
      };
    }
  }

  return {
    season,
    daysRemaining: daysRemainingInSeason(),
    entries,
    userRank,
  };
}

/** Archive the previous calendar month's season label (idempotent). */
export async function archivePreviousSeason(): Promise<{
  archived: boolean;
  label: string | null;
}> {
  const { seasons } = await getCollections();
  const now = new Date();
  const prev = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  );
  const label = seasonLabelFromDate(prev);
  const result = await seasons.updateOne(
    { label, archived: { $ne: true } },
    {
      $set: {
        archived: true,
        archivedAt: new Date(),
        name: seasonNameFromLabel(label),
        ...monthBounds(label),
      },
      $setOnInsert: { label, createdAt: new Date() },
    },
    { upsert: true }
  );

  // Ensure current season exists
  await getCurrentSeason(seasons);

  return {
    archived: result.modifiedCount > 0 || result.upsertedCount > 0,
    label,
  };
}

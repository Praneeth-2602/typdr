import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface KeystrokeEvent {
  expectedChar: string;
  typedChar: string;
  timestamp: number;
  correct: boolean;
  latencyMs: number | null;
}

export interface WeakKeyStat {
  key: string;
  attempts: number;
  accuracy: number;
  avgLatency: number;
  weaknessScore: number;
}

export interface LeaderboardEntry {
  sessionId: string;
  timestamp: number;
  mode: SessionResult["mode"];
  score: number;
  wpm: number;
  accuracy: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDateUtc: string | null;
}

export interface SessionResult {
  id: string;
  timestamp: number;
  mode: "words" | "time" | "quote" | "code" | "custom";
  duration: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  totalChars: number;
  correctChars: number;
  incorrectChars: number;
  keyStats: Record<string, { hits: number; misses: number; avgMs: number }>;
  bigramTimings: Record<string, number[]>;
  keystrokeLog: KeystrokeEvent[];
  feedback?: string[];
  score: number;
}

export interface LessonProgress {
  lessonId: string;
  completedAt: number;
  bestWpm: number;
  bestAccuracy: number;
  attempts: number;
}

interface AnalyticsState {
  sessions: SessionResult[];
  lessonProgress: Record<string, LessonProgress>;
  streak: StreakInfo;
  addSession: (session: SessionResult) => void;
  updateLesson: (progress: LessonProgress) => void;
  clearAll: () => void;
  // Derived helpers
  getAverageWpm: () => number;
  getTopWpm: () => number;
  getBestScore: () => number;
  getRecentAverageScore: () => number;
  getWeakKeys: (n?: number) => WeakKeyStat[];
  getStrongKeys: (n?: number) => WeakKeyStat[];
  getWeakestKeys: (n?: number) => { key: string; accuracy: number }[];
  getSlowestBigrams: (n?: number) => { bigram: string; avgMs: number }[];
  getKeyHeatmap: () => Record<string, { accuracy: number; volume: number }>;
  getLeaderboardEntries: (n?: number) => LeaderboardEntry[];
  getStreakInfo: () => StreakInfo;
  getWpmHistory: () => { date: string; wpm: number; sessionId: string }[];
  // v2 additions
  getStreakDays: () => number;
  getAccuracyTrend: () => number; // +/- vs prev 10 sessions
}

const WEAK_KEY_PATTERN = /[a-z,./;']/;
const WEAKNESS_ACCURACY_WEIGHT = 0.7;
const WEAKNESS_LATENCY_WEIGHT = 0.3;

function getUtcDateLabel(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function diffUtcDays(a: string, b: string): number {
  const aMs = Date.parse(`${a}T00:00:00.000Z`);
  const bMs = Date.parse(`${b}T00:00:00.000Z`);
  return Math.round((aMs - bMs) / 86400000);
}

function createEmptyStreak(): StreakInfo {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDateUtc: null,
  };
}

function updateStreak(streak: StreakInfo, timestamp: number): StreakInfo {
  const todayUtc = getUtcDateLabel(timestamp);
  if (streak.lastActiveDateUtc === todayUtc) return streak;

  let currentStreak = 1;
  if (streak.lastActiveDateUtc) {
    const dayGap = diffUtcDays(todayUtc, streak.lastActiveDateUtc);
    currentStreak = dayGap === 1 ? streak.currentStreak + 1 : 1;
  }

  return {
    currentStreak,
    longestStreak: Math.max(streak.longestStreak, currentStreak),
    lastActiveDateUtc: todayUtc,
  };
}

function normalizeScore(score: number): number {
  return Math.round(score * 10) / 10;
}

function buildWeakKeyStats(sessions: SessionResult[]): WeakKeyStat[] {
  const combined: Record<string, { attempts: number; correct: number; totalLatency: number; latencyCount: number }> = {};

  for (const session of sessions) {
    for (const event of session.keystrokeLog ?? []) {
      const key = event.expectedChar.toLowerCase();
      if (key.length !== 1 || !WEAK_KEY_PATTERN.test(key)) continue;
      if (!combined[key]) {
        combined[key] = { attempts: 0, correct: 0, totalLatency: 0, latencyCount: 0 };
      }
      combined[key].attempts += 1;
      if (event.correct) combined[key].correct += 1;
      if (typeof event.latencyMs === "number" && event.latencyMs > 0 && event.latencyMs < 2000) {
        combined[key].totalLatency += event.latencyMs;
        combined[key].latencyCount += 1;
      }
    }
  }

  const rows = Object.entries(combined)
    .filter(([, stat]) => stat.attempts >= 3)
    .map(([key, stat]) => ({
      key,
      attempts: stat.attempts,
      accuracy: stat.correct / stat.attempts,
      avgLatency: stat.latencyCount > 0 ? stat.totalLatency / stat.latencyCount : 0,
    }));

  if (!rows.length) return [];

  const latencyValues = rows.map((row) => row.avgLatency);
  const minLatency = Math.min(...latencyValues);
  const maxLatency = Math.max(...latencyValues);
  const latencyRange = maxLatency - minLatency;

  return rows
    .map((row) => {
      const normalizedLatency =
        row.avgLatency <= 0
          ? 0
          : latencyRange === 0
          ? 0.5
          : (row.avgLatency - minLatency) / latencyRange;

      const weaknessScore =
        (1 - row.accuracy) * WEAKNESS_ACCURACY_WEIGHT +
        normalizedLatency * WEAKNESS_LATENCY_WEIGHT;

      return {
        key: row.key,
        attempts: row.attempts,
        accuracy: Math.round(row.accuracy * 100),
        avgLatency: Math.round(row.avgLatency),
        weaknessScore: Math.round(weaknessScore * 1000) / 1000,
      };
    })
    .sort((a, b) => {
      if (b.weaknessScore !== a.weaknessScore) return b.weaknessScore - a.weaknessScore;
      if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
      return b.avgLatency - a.avgLatency;
    });
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      sessions: [],
      lessonProgress: {},
      streak: createEmptyStreak(),

      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions].slice(0, 1000),
          streak: updateStreak(state.streak, session.timestamp),
        })),

      updateLesson: (progress) =>
        set((state) => ({
          lessonProgress: {
            ...state.lessonProgress,
            [progress.lessonId]: {
              ...state.lessonProgress[progress.lessonId],
              ...progress,
              // never reduce best scores
              bestWpm: Math.max(
                progress.bestWpm,
                state.lessonProgress[progress.lessonId]?.bestWpm ?? 0
              ),
              bestAccuracy: Math.max(
                progress.bestAccuracy,
                state.lessonProgress[progress.lessonId]?.bestAccuracy ?? 0
              ),
            },
          },
        })),

      clearAll: () => set({ sessions: [], lessonProgress: {}, streak: createEmptyStreak() }),

      getAverageWpm: () => {
        const { sessions } = get();
        if (!sessions.length) return 0;
        const recent = sessions.slice(0, 20);
        return Math.round(recent.reduce((acc, s) => acc + s.wpm, 0) / recent.length);
      },

      getTopWpm: () => {
        const { sessions } = get();
        if (!sessions.length) return 0;
        return Math.max(...sessions.map((s) => s.wpm));
      },

      getBestScore: () => {
        const { sessions } = get();
        if (!sessions.length) return 0;
        return normalizeScore(Math.max(...sessions.map((s) => s.score ?? s.wpm * (s.accuracy / 100))));
      },

      getRecentAverageScore: () => {
        const { sessions } = get();
        if (!sessions.length) return 0;
        const recent = sessions.slice(0, 10);
        return normalizeScore(
          recent.reduce((acc, session) => acc + (session.score ?? session.wpm * (session.accuracy / 100)), 0) / recent.length
        );
      },

      getWeakKeys: (n = 5) => buildWeakKeyStats(get().sessions).slice(0, n),

      getStrongKeys: (n = 5) =>
        [...buildWeakKeyStats(get().sessions)]
          .sort((a, b) => {
            if (a.weaknessScore !== b.weaknessScore) return a.weaknessScore - b.weaknessScore;
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            return a.avgLatency - b.avgLatency;
          })
          .slice(0, n),

      getWeakestKeys: (n = 5) => {
        return get().getWeakKeys(n).map(({ key, accuracy }) => ({ key, accuracy }));
      },

      getSlowestBigrams: (n = 5) => {
        const { sessions } = get();
        const combined: Record<string, number[]> = {};
        for (const s of sessions) {
          for (const [bg, timings] of Object.entries(s.bigramTimings)) {
            if (!combined[bg]) combined[bg] = [];
            combined[bg].push(...timings);
          }
        }
        return Object.entries(combined)
          .filter(([, timings]) => timings.length >= 3) // need enough samples
          .map(([bigram, timings]) => ({
            bigram,
            avgMs: Math.round(timings.reduce((a, b) => a + b, 0) / timings.length),
          }))
          .sort((a, b) => b.avgMs - a.avgMs)
          .slice(0, n);
      },

      getKeyHeatmap: () => {
        const { sessions } = get();
        const combined: Record<string, { hits: number; misses: number }> = {};
        for (const s of sessions) {
          for (const [key, stat] of Object.entries(s.keyStats)) {
            if (!combined[key]) combined[key] = { hits: 0, misses: 0 };
            combined[key].hits += stat.hits;
            combined[key].misses += stat.misses;
          }
        }
        return Object.fromEntries(
          Object.entries(combined).map(([key, { hits, misses }]) => [
            key,
            {
              accuracy: Math.round((hits / Math.max(hits + misses, 1)) * 100),
              volume: hits + misses,
            },
          ])
        );
      },

      getLeaderboardEntries: (n = 10) => {
        const { sessions } = get();
        return [...sessions]
          .map((session) => ({
            sessionId: session.id,
            timestamp: session.timestamp,
            mode: session.mode,
            score: normalizeScore(session.score ?? session.wpm * (session.accuracy / 100)),
            wpm: session.wpm,
            accuracy: session.accuracy,
          }))
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.wpm !== a.wpm) return b.wpm - a.wpm;
            if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
            return b.timestamp - a.timestamp;
          })
          .slice(0, n);
      },

      getStreakInfo: () => get().streak,

      getWpmHistory: () => {
        const { sessions } = get();
        return [...sessions]
          .slice(0, 50)
          .reverse()
          .map((s) => ({
            date: new Date(s.timestamp).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
            }),
            wpm: s.wpm,
            sessionId: s.id,
          }));
      },

      // How many consecutive calendar days had at least one session
      getStreakDays: () => get().streak.currentStreak,

      // +/- WPM delta between last 10 and prev 10 sessions
      getAccuracyTrend: () => {
        const { sessions } = get();
        if (sessions.length < 5) return 0;
        const recent = sessions.slice(0, 10);
        const older = sessions.slice(10, 20);
        if (!older.length) return 0;
        const recentAvg = recent.reduce((a, s) => a + s.wpm, 0) / recent.length;
        const olderAvg = older.reduce((a, s) => a + s.wpm, 0) / older.length;
        return Math.round(recentAvg - olderAvg);
      },
    }),
    {
      name: "swiftkeys-analytics-v2",
      version: 3,
      migrate: (persistedState: unknown, version) => {
        const state = (persistedState ?? {}) as Partial<AnalyticsState> & {
          sessions?: Partial<SessionResult>[];
        };

        const sessions = (state.sessions ?? []).map((session) => ({
          ...session,
          keystrokeLog: session.keystrokeLog ?? [],
          score: session.score ?? normalizeScore((session.wpm ?? 0) * ((session.accuracy ?? 0) / 100)),
        })) as SessionResult[];

        if (version < 3) {
          const streak = sessions
            .slice()
            .sort((a, b) => a.timestamp - b.timestamp)
            .reduce((acc, session) => updateStreak(acc, session.timestamp), createEmptyStreak());

          return {
            ...state,
            sessions,
            streak,
          };
        }

        return {
          ...state,
          sessions,
          streak: state.streak ?? createEmptyStreak(),
        };
      },
    }
  )
);

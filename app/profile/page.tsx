"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  Award,
  BarChart2,
  Flame,
  Trophy,
  User,
  Zap,
  Calendar,
  Target,
  Sparkles,
  Loader2,
} from "lucide-react";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { PageLoader } from "@/components/PageLoader";
import { XpBar } from "@/components/gamification/XpBar";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { useAnalyticsStore } from "@/lib/stores/analytics";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UserStatsData {
  username: string;
  sessionsCompleted: number;
  xp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  joinDate?: string | null;
  bestWpm?: number;
  avgAccuracy?: number;
  totalTimeMs?: number;
  leaderboardRank?: number | null;
  recentSessions?: Array<{
    id: string;
    timestamp: number;
    mode: string;
    wpm: number;
    accuracy: number;
  }>;
  weakKeys: { key: string; accuracy: number; count: number }[];
  strongKeys: { key: string; accuracy: number; count: number }[];
  updatedAt: string | null;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActive: string | null;
}

interface CoachDay {
  day: number;
  focus: string;
  drill: string;
  durationMin: number;
}

interface CoachPlanData {
  level: string;
  weaknesses: string[];
  summary: string;
  days: CoachDay[];
  source: "llm" | "rules";
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-surface-tertiary/60 ${className ?? ""}`} />
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-3">
        {icon}
        {label}
      </div>
      <div
        className={`font-mono font-bold text-2xl ${
          accent ? "text-brand" : "text-slate-100"
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-slate-600 mt-1 font-mono">{sub}</div>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [statsData, setStatsData] = useState<UserStatsData | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [coachPlan, setCoachPlan] = useState<CoachPlanData | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local analytics (fallback when server has no history yet)
  const topWpm = useAnalyticsStore((s) => s.getTopWpm());
  const avgWpm = useAnalyticsStore((s) => s.getAverageWpm());
  const sessions = useAnalyticsStore((s) => s.sessions);
  const localRecent = sessions.slice(0, 20);
  const recentSessions = (statsData?.recentSessions?.length
    ? statsData.recentSessions
    : localRecent) as Array<{
    id: string;
    timestamp: number;
    mode: string;
    wpm: number;
    accuracy: number;
  }>;

  useEffect(() => {
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    if (status !== "authenticated") return;

    let active = true;
    (async () => {
      try {
        const [statsRes, streakRes] = await Promise.all([
          fetch("/api/user-stats"),
          fetch("/api/streak"),
        ]);
        const [stats, streak] = await Promise.all([
          statsRes.json(),
          streakRes.json(),
        ]);
        if (!active) return;
        if (!statsRes.ok) throw new Error(stats.error ?? "Failed to load stats.");
        if (!streakRes.ok) throw new Error(streak.error ?? "Failed to load streak.");
        setStatsData(stats);
        setStreakData(streak);

        // Coach plan (optional — needs ≥5 sessions)
        setCoachLoading(true);
        try {
          const coachRes = await fetch("/api/coach");
          const coachJson = await coachRes.json();
          if (active && coachRes.ok && coachJson.plan) {
            setCoachPlan(coachJson.plan as CoachPlanData);
            setCoachError(null);
          } else if (active && coachRes.status === 400) {
            setCoachError(coachJson.error ?? null);
            setCoachPlan(null);
          }
        } catch {
          // coach is best-effort
        } finally {
          if (active) setCoachLoading(false);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [status]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
        <Link href="/" className="font-mono font-bold text-base tracking-tight">
          <span className="text-brand">typ</span>
          <span className="text-sky-400">dr</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link href="/practice" className="hover:text-slate-200">Practice</Link>
          <Link href="/learn" className="hover:text-slate-200">Learn</Link>
          <Link href="/analytics" className="hover:text-slate-200">Analytics</Link>
          <Link href="/leaderboard" className="hover:text-slate-200">Leaderboard</Link>
          <ThemeSwitcher />
          <AuthButtons />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Not signed in */}
        {status === "unauthenticated" && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <User size={40} className="text-slate-600 mb-4" />
            <h2 className="font-mono font-bold text-xl text-slate-200 mb-2">
              Sign in to view your profile
            </h2>
            <p className="text-slate-500 font-mono text-sm mb-6">
              Your stats, streak, and history are saved when you're signed in.
            </p>
            <Link
              href="/signin"
              className="px-5 py-2.5 bg-brand text-surface font-mono font-bold text-sm rounded-lg hover:bg-brand-dim"
            >
              Sign in
            </Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        {status === "authenticated" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center gap-5 p-6 bg-surface-secondary border border-surface-border rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(232,245,92,0.08),transparent_50%)]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 font-mono text-2xl font-bold text-brand">
                {session.user?.name?.slice(0, 2).toUpperCase() ?? "??"}
              </div>
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-1">
                  Profile
                </div>
                <h1 className="font-mono font-bold text-2xl text-slate-100">
                  {session.user?.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-mono text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={11} />
                    {statsData?.joinDate
                      ? `Joined ${new Date(statsData.joinDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : "No sessions yet"}
                  </span>
                  {statsData?.leaderboardRank != null && (
                    <span className="inline-flex items-center gap-1.5 text-brand">
                      <Trophy size={11} />
                      Rank #{statsData.leaderboardRank}
                    </span>
                  )}
                  {statsData?.updatedAt && (
                    <span>
                      Last active{" "}
                      {new Date(statsData.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* XP / Level bar */}
            {statsData && (
              <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-3">
                  <Zap size={12} />
                  Level progress
                </div>
                <XpBar
                  xp={statsData.xp}
                  level={statsData.level}
                  xpForCurrentLevel={statsData.xpForCurrentLevel}
                  xpForNextLevel={statsData.xpForNextLevel}
                />
              </div>
            )}

            {/* AI typing coach */}
            <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_45%)]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                  <Sparkles size={12} className="text-sky-400" />
                  AI typing coach · 7-day plan
                </div>
                {coachPlan && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">
                    {coachPlan.level} · {coachPlan.source === "llm" ? "LLM" : "rules"}
                  </span>
                )}
              </div>

              {coachLoading && (
                <div className="flex items-center gap-2 font-mono text-xs text-slate-500 py-4">
                  <Loader2 size={14} className="animate-spin" />
                  Diagnosing your weaknesses…
                </div>
              )}

              {!coachLoading && coachError && (
                <p className="font-mono text-xs text-slate-500 py-2">{coachError}</p>
              )}

              {!coachLoading && coachPlan && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{coachPlan.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {coachPlan.weaknesses.map((w) => (
                      <span
                        key={w}
                        className="rounded-lg border border-sky-900/40 bg-sky-950/20 px-2.5 py-1 font-mono text-[11px] text-sky-300"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {coachPlan.days.map((d) => (
                      <div
                        key={d.day}
                        className="rounded-xl border border-surface-border bg-surface/40 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
                            Day {d.day}
                          </span>
                          <span className="font-mono text-[10px] text-slate-600">
                            {d.durationMin} min
                          </span>
                        </div>
                        <div className="font-mono text-xs font-bold text-slate-200 mb-0.5">
                          {d.focus}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{d.drill}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={<Activity size={12} />}
                label="Total sessions"
                value={statsData?.sessionsCompleted ?? sessions.length}
              />
              <StatCard
                icon={<Trophy size={12} />}
                label="Best WPM"
                value={statsData?.bestWpm && statsData.bestWpm > 0 ? Math.round(statsData.bestWpm) : topWpm}
                accent
              />
              <StatCard
                icon={<Target size={12} />}
                label="Avg accuracy"
                value={`${statsData?.avgAccuracy ?? 0}%`}
                sub={
                  statsData?.totalTimeMs != null
                    ? `${Math.round((statsData.totalTimeMs || 0) / 60000)} min typed`
                    : `Local avg ${Math.round(avgWpm)} wpm`
                }
              />
              <StatCard
                icon={<Flame size={12} />}
                label="Current streak"
                value={`${streakData?.currentStreak ?? 0} days`}
                sub={`Best: ${streakData?.longestStreak ?? 0} days`}
                accent={!!streakData?.currentStreak}
              />
            </div>

            {/* Weak / strong keys */}
            {statsData && statsData.weakKeys.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-3">
                    <BarChart2 size={12} />
                    Keys to improve
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statsData.weakKeys.map((k) => (
                      <div
                        key={k.key}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/20 border border-red-900/30 rounded-lg"
                      >
                        <span className="font-mono font-bold text-sm text-red-300">{k.key}</span>
                        <span className="font-mono text-xs text-slate-500">{Math.round(k.accuracy)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-3">
                    <Award size={12} />
                    Strong keys
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statsData.strongKeys.map((k) => (
                      <div
                        key={k.key}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-950/20 border border-green-900/30 rounded-lg"
                      >
                        <span className="font-mono font-bold text-sm text-green-300">{k.key}</span>
                        <span className="font-mono text-xs text-slate-500">{Math.round(k.accuracy)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-3 flex-wrap">
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-surface-border rounded-lg font-mono text-sm text-slate-300 hover:bg-surface-hover transition-all"
              >
                <BarChart2 size={14} />
                Full analytics
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary border border-surface-border rounded-lg font-mono text-sm text-slate-300 hover:bg-surface-hover transition-all"
              >
                <Trophy size={14} />
                Leaderboard
              </Link>
              <Link
                href="/practice"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-surface rounded-lg font-mono font-bold text-sm hover:bg-brand-dim transition-all"
              >
                <Zap size={14} />
                Start practicing
              </Link>
            </div>

            {/* Recent sessions */}
            <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono uppercase tracking-wide">
                  <Activity size={12} />
                  Recent sessions
                </div>
                <span className="text-xs font-mono text-slate-600">
                  {recentSessions.length} shown
                </span>
              </div>

              {recentSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-surface-border bg-surface/40 px-3 py-6 text-center font-mono text-xs text-slate-500">
                  Complete some sessions to see your history here.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-slate-500 border-b border-surface-border">
                        <th className="text-left pb-2">Date</th>
                        <th className="text-left pb-2 pl-4">Mode</th>
                        <th className="text-right pb-2 pl-4">WPM</th>
                        <th className="text-right pb-2 pl-4">Accuracy</th>
                        <th className="text-right pb-2 pl-4">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.map((s) => (
                        <tr key={s.id} className="border-b border-surface-border/40 last:border-0">
                          <td className="py-2 text-slate-400">
                            {new Date(s.timestamp).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2 pl-4 text-slate-500 uppercase tracking-wide">{s.mode}</td>
                          <td className="py-2 pl-4 text-right font-bold text-brand">{s.wpm}</td>
                          <td className="py-2 pl-4 text-right text-slate-300">{s.accuracy}%</td>
                          <td className="py-2 pl-4 text-right text-slate-400">
                            {(s.wpm * (s.accuracy / 100)).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

"use client";

// ─────────────────────────────────────────────────────────────────────────────
// analytics/page.tsx  v4  (Phase 2)
//
// v4 changes:
//  + XP / level bar (server-synced)
//  + Cached AI drill recommendation panel
//  + Pulls xp, level, cachedDrill from /api/user-stats
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { Zap, Trash2, TrendingUp, TrendingDown, Target, Activity, Flame, Download, Trophy } from "lucide-react";
import { KeyboardHeatmap } from "@/components/keyboard/KeyboardHeatmap";
import { PageLoader } from "@/components/PageLoader";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { useAnalyticsStore } from "@/lib/stores/analytics";
import type { StreakInfo, WeakKeyStat } from "@/lib/stores/analytics";
import { XpBar } from "@/components/gamification/XpBar";

type HeatmapView = "accuracy" | "volume" | "finger";

function StatCard({ icon, label, value, unit, sub, trend }: {
  icon: React.ReactNode; label: string; value: string | number;
  unit?: string; sub?: string; trend?: number;
}) {
  return (
    <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
      <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-3">{icon}{label}</div>
      <div className="font-mono font-bold text-2xl text-slate-100">
        {value}{unit && <span className="text-base text-slate-500 ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
      {trend !== undefined && Math.abs(trend) >= 2 && (
        <div className={`flex items-center gap-1 text-xs mt-1 font-mono ${trend > 0 ? "text-correct" : "text-incorrect"}`}>
          {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend > 0 ? "+" : ""}{trend} vs prev
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string;
}) => {
  if (active && payload?.length) {
    return (
      <div className="bg-surface-secondary border border-surface-border rounded-lg px-3 py-2 text-xs font-mono space-y-1">
        <div className="text-slate-400 mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const sessions        = useAnalyticsStore((s) => s.sessions);
  const getAverageWpm   = useAnalyticsStore((s) => s.getAverageWpm);
  const getTopWpm       = useAnalyticsStore((s) => s.getTopWpm);
  const getBestScore    = useAnalyticsStore((s) => s.getBestScore);
  const getRecentAverageScore = useAnalyticsStore((s) => s.getRecentAverageScore);
  const getWeakKeys     = useAnalyticsStore((s) => s.getWeakKeys);
  const getStrongKeys   = useAnalyticsStore((s) => s.getStrongKeys);
  const getWeakestKeys  = useAnalyticsStore((s) => s.getWeakestKeys);
  const getSlowestBigrams = useAnalyticsStore((s) => s.getSlowestBigrams);
  const getKeyHeatmap   = useAnalyticsStore((s) => s.getKeyHeatmap);
  const getStreakInfo   = useAnalyticsStore((s) => s.getStreakInfo);
  const getWpmHistory   = useAnalyticsStore((s) => s.getWpmHistory);
  const getStreakDays   = useAnalyticsStore((s) => s.getStreakDays);
  const getAccuracyTrend = useAnalyticsStore((s) => s.getAccuracyTrend);
  const clearAll        = useAnalyticsStore((s) => s.clearAll);

  const [loadingDrill, setLoadingDrill] = useState(false);
  const [drillText, setDrillText]       = useState<string | null>(null);
  const [drillProviderUsed, setDrillProviderUsed] = useState<"groq" | "gemini" | null>(null);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [heatmapView, setHeatmapView]   = useState<HeatmapView>("accuracy");
  const [exportingCsv, setExportingCsv] = useState(false);
  const [loadingServerData, setLoadingServerData] = useState(status === "authenticated");
  const [serverWeakKeys, setServerWeakKeys] = useState<WeakKeyStat[] | null>(null);
  const [serverStrongKeys, setServerStrongKeys] = useState<WeakKeyStat[] | null>(null);
  const [serverStreak, setServerStreak] = useState<StreakInfo | null>(null);
  const [serverXp, setServerXp] = useState<{ xp: number; level: number; xpForCurrentLevel: number; xpForNextLevel: number } | null>(null);
  const [serverCachedDrill, setServerCachedDrill] = useState<{ text: string; weakKeys: string[]; mode: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Show loader while checking auth or loading server data
  if (status === "loading") {
    return <PageLoader />;
  }

  const avgWpm      = getAverageWpm();
  const topWpm      = getTopWpm();
  const bestScore   = getBestScore();
  const recentAverageScore = getRecentAverageScore();
  const weakKeyStats = getWeakKeys(5);
  const strongKeyStats = getStrongKeys(5);
  const weakKeys    = getWeakestKeys(5);
  const slowBigrams = getSlowestBigrams(5);
  const heatmap     = getKeyHeatmap();
  const streakInfo  = getStreakInfo();
  const wpmHistory  = getWpmHistory();
  const streakDays  = getStreakDays();
  const wpmTrend    = getAccuracyTrend();
  const displayedWeakKeys = serverWeakKeys ?? weakKeyStats;
  const displayedStrongKeys = serverStrongKeys ?? strongKeyStats;
  const displayedStreak = serverStreak ?? streakInfo;

  useEffect(() => {
    let active = true;

    async function loadServerData() {
      if (status !== "authenticated") {
        if (!active) return;
        setLoadingServerData(false);
        setServerWeakKeys(null);
        setServerStrongKeys(null);
        setServerStreak(null);
        setServerXp(null);
        setServerCachedDrill(null);
        setServerError(null);
        return;
      }

      setLoadingServerData(true);
      try {
        const [statsRes, streakRes] = await Promise.all([
          fetch("/api/user-stats"),
          fetch("/api/streak"),
        ]);

        const [statsData, streakData] = await Promise.all([
          statsRes.json(),
          streakRes.json(),
        ]);

        if (!statsRes.ok) throw new Error(statsData.error ?? "Failed to load user stats.");
        if (!streakRes.ok) throw new Error(streakData.error ?? "Failed to load streak.");

        if (!active) return;
        setServerWeakKeys(Array.isArray(statsData.weakKeys) ? statsData.weakKeys : []);
        setServerStrongKeys(Array.isArray(statsData.strongKeys) ? statsData.strongKeys : []);
        setServerStreak(streakData);
        setServerXp(
          typeof statsData.xp === "number"
            ? { xp: statsData.xp, level: statsData.level ?? 1, xpForCurrentLevel: statsData.xpForCurrentLevel ?? 0, xpForNextLevel: statsData.xpForNextLevel ?? 100 }
            : null
        );
        setServerCachedDrill(statsData.cachedDrill ?? null);
        setServerError(null);
        setLoadingServerData(false);
      } catch (error) {
        if (!active) return;
        setServerError(error instanceof Error ? error.message : "Failed to load backend analytics.");
        setLoadingServerData(false);
      }
    }

    loadServerData();
    return () => {
      active = false;
    };
  }, [status, session?.user?.id]);

  const totalSessions = sessions.length;
  const totalMinutes  = Math.round(sessions.reduce((acc, s) => acc + s.duration, 0) / 60);
  const avgAccuracy   = sessions.length > 0
    ? Math.round(sessions.slice(0, 20).reduce((acc, s) => acc + s.accuracy, 0) / Math.min(sessions.length, 20))
    : 0;

  // Multi-line chart data: wpm + accuracy + consistency per session
  const chartData = [...sessions].slice(0, 50).reverse().map((s) => ({
    date: new Date(s.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    wpm: s.wpm,
    accuracy: s.accuracy,
    consistency: s.consistency,
  }));

  // Per-mode breakdown
  const modeBreakdown = (() => {
    const modes = ["words", "time", "quote", "code", "custom", "daily", "pangram"] as const;
    return modes.map((m) => {
      const filtered = sessions.filter((s) => s.mode === m);
      if (!filtered.length) return null;
      return {
        mode: m,
        count: filtered.length,
        avgWpm: Math.round(filtered.reduce((a, s) => a + s.wpm, 0) / filtered.length),
        avgAcc: Math.round(filtered.reduce((a, s) => a + s.accuracy, 0) / filtered.length),
      };
    }).filter(Boolean);
  })();

  // Show loader while fetching server data
  if (loadingServerData && status === "authenticated") {
    return <PageLoader />;
  }

  const handleGenerateDrill = async (drillMode: "words" | "sentences" | "code") => {
    setDrillError(null);
    setDrillProviderUsed(null);
    setLoadingDrill(true);
    setDrillText(null);
    try {
      const res = await fetch("/api/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weakKeys: weakKeys.map((w) => w.key),
          slowBigrams: slowBigrams.map((b) => b.bigram),
          currentWpm: avgWpm,
          mode: drillMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate drill");
      }
      if (data.drill) {
        setDrillText(data.drill);
        setDrillProviderUsed(data.provider ?? null);
      } else {
        throw new Error("Empty drill response.");
      }
    } catch (error) {
      setDrillError(error instanceof Error ? error.message : "Failed to generate drill");
    } finally {
      setLoadingDrill(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessions),
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `typdr-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExportingCsv(false);
    }
  };

  if (totalSessions === 0) {
    return (
      <div className="min-h-screen bg-surface flex flex-col">
        <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
          <Link href="/" className="font-mono font-bold text-base"><span className="text-brand">typ</span><span className="text-sky-400">dr</span></Link>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/learn" className="hover:text-slate-200">Learn</Link>
            <Link href="/practice" className="hover:text-slate-200">Practice</Link>
            <Link href="/leaderboard" className="hover:text-slate-200">Leaderboard</Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <div className="text-4xl mb-4">📊</div>
            <h2 className="font-mono font-bold text-slate-100 text-xl mb-2">No data yet</h2>
            <p className="text-slate-500 text-sm mb-6">Complete some practice sessions to see your analytics.</p>
            <Link href="/practice" className="px-5 py-2.5 bg-brand text-surface font-mono font-bold text-sm rounded-lg hover:bg-brand-dim">
              Start practicing →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
        <Link href="/" className="font-mono font-bold text-base"><span className="text-brand">typ</span><span className="text-sky-400">dr</span></Link>
        <div className="flex gap-6 text-sm text-slate-500">
          <Link href="/learn" className="hover:text-slate-200">Learn</Link>
          <Link href="/practice" className="hover:text-slate-200">Practice</Link>
          <Link href="/leaderboard" className="hover:text-slate-200">Leaderboard</Link>
          <AuthButtons />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-mono font-bold text-2xl text-slate-100 mb-1">Your analytics</h1>
            <p className="text-xs text-slate-500 font-mono">All data stored locally · never leaves your browser</p>
          </div>
          <div className="flex items-center gap-2">
            {/* CSV export — v3 new */}
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-surface-border text-slate-400 hover:text-slate-200 hover:border-slate-600 font-mono text-xs rounded-lg transition-all disabled:opacity-40"
            >
              <Download size={12} />{exportingCsv ? "Exporting…" : "Export CSV"}
            </button>
            <button onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900/40 text-red-500/60 hover:text-red-400 hover:border-red-800 font-mono text-xs rounded-lg transition-all">
              <Trash2 size={12} />Clear data
            </button>
          </div>
        </div>

        {confirmClear && (
          <div className="mb-6 p-4 bg-red-950/30 border border-red-900/40 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-red-400 font-mono">Delete all {totalSessions} sessions? This cannot be undone.</span>
            <div className="flex gap-2">
              <button onClick={() => setConfirmClear(false)} className="px-3 py-1.5 text-xs font-mono border border-surface-border text-slate-400 rounded-lg hover:bg-surface-hover">Cancel</button>
              <button onClick={() => { clearAll(); setConfirmClear(false); }} className="px-3 py-1.5 text-xs font-mono bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900">Delete all</button>
            </div>
          </div>
        )}

        {status !== "authenticated" && (
          <div className="mb-8 rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-xs font-mono text-amber-300">
            You are viewing local analytics only. Sign in to load synced weak keys and streaks.
          </div>
        )}

        {serverError && (
          <div className="mb-8 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-xs font-mono text-red-300">
            {serverError} Falling back to local analytics for now.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          <StatCard icon={<Activity size={12} />}   label="avg wpm"   value={avgWpm}      unit="wpm" trend={wpmTrend} />
          <StatCard icon={<TrendingUp size={12} />}  label="best wpm"  value={topWpm}      unit="wpm" />
          <StatCard icon={<Target size={12} />}      label="avg acc"   value={avgAccuracy} unit="%" />
          <StatCard icon={<Trophy size={12} />}      label="best score" value={bestScore} />
          <StatCard icon={<Zap size={12} />}         label="sessions"  value={totalSessions} sub={`${totalMinutes} min`} />
          <StatCard icon={<Flame size={12} />}       label="streak"    value={displayedStreak.currentStreak}  sub={displayedStreak.longestStreak > 0 ? `best ${displayedStreak.longestStreak} days` : "start today"} />
        </div>

        {/* ── Phase 2: XP / Level bar ────────────────────────────────────────── */}
        {serverXp && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <XpBar
              xp={serverXp.xp}
              level={serverXp.level}
              xpForCurrentLevel={serverXp.xpForCurrentLevel}
              xpForNextLevel={serverXp.xpForNextLevel}
            />
          </motion.div>
        )}

        {/* ── Phase 2: Cached AI drill recommendation ────────────────────────── */}
        {serverCachedDrill && (
          <motion.div
            className="mb-8 p-5 bg-surface-secondary border border-brand/30 rounded-xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="font-mono text-xs uppercase tracking-wide text-brand flex items-center gap-2">
                <Zap size={12} />
                🔥 Recommended drill
              </div>
              {serverCachedDrill.weakKeys.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs text-slate-600 font-mono">targets:</span>
                  {serverCachedDrill.weakKeys.map((k) => (
                    <span
                      key={k}
                      className="px-1.5 py-0.5 bg-red-950/40 border border-red-900/30 rounded text-xs font-mono font-bold text-red-400"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="font-mono text-sm text-slate-300 leading-relaxed mb-4 bg-surface-tertiary/50 rounded-lg px-4 py-3 border border-surface-border">
              {serverCachedDrill.text}
            </p>
            <Link
              href={`/practice?drill=${encodeURIComponent(serverCachedDrill.text)}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-surface font-mono text-xs font-bold rounded-lg hover:bg-brand-dim transition-colors"
            >
              <Zap size={12} />
              Practice this drill
            </Link>
          </motion.div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="p-6 bg-surface-secondary border border-surface-border rounded-xl">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wide mb-2">Streak status</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/30 border border-amber-900/30 flex items-center justify-center text-amber-300">
                <Flame size={16} />
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-slate-100">{displayedStreak.currentStreak} day{displayedStreak.currentStreak === 1 ? "" : "s"}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {displayedStreak.lastActiveDateUtc
                    ? `Last active UTC day: ${displayedStreak.lastActiveDateUtc}`
                    : "No activity recorded yet"}
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              One completed test per UTC day keeps the streak alive. Multiple sessions on the same day count once.
            </p>
          </div>

          <div className="p-6 bg-surface-secondary border border-surface-border rounded-xl">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wide mb-2">Score snapshot</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-surface-border bg-surface-tertiary/60 p-4">
                <div className="font-mono text-[11px] uppercase tracking-wide text-slate-500">best score</div>
                <div className="mt-2 text-2xl font-mono font-bold text-brand">{bestScore}</div>
              </div>
              <div className="rounded-xl border border-surface-border bg-surface-tertiary/60 p-4">
                <div className="font-mono text-[11px] uppercase tracking-wide text-slate-500">recent avg</div>
                <div className="mt-2 text-2xl font-mono font-bold text-slate-100">{recentAverageScore}</div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500 font-mono">
              score = WPM × accuracy
            </p>
          </div>
        </div>

        {/* Multi-line chart — v3 new */}
        {chartData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-surface-secondary border border-surface-border rounded-xl">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wide mb-5">
              Performance over time (WPM · accuracy · consistency)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#2a2a30" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#475569", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#475569", fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono", color: "#64748b", paddingTop: 12 }} />
                <Line type="monotone" dataKey="wpm"         name="wpm"         stroke="#e8f55c" strokeWidth={2} dot={{ fill: "#e8f55c", r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="accuracy"    name="accuracy"    stroke="#4ade80" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="consistency" name="consistency" stroke="#818cf8" strokeWidth={1.5} dot={false} strokeDasharray="2 3" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Per-mode breakdown — v3 new */}
        {modeBreakdown.length > 0 && (
          <div className="mb-8 p-6 bg-surface-secondary border border-surface-border rounded-xl">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wide mb-4">Performance by mode</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-surface-border">
                    <th className="text-left pb-2 pr-4">mode</th>
                    <th className="text-right pb-2 px-4">sessions</th>
                    <th className="text-right pb-2 px-4">avg wpm</th>
                    <th className="text-right pb-2 pl-4">avg accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {modeBreakdown.map((row) => row && (
                    <tr key={row.mode} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-2 pr-4 capitalize text-slate-300">{row.mode}</td>
                      <td className="py-2 px-4 text-right text-slate-500">{row.count}</td>
                      <td className="py-2 px-4 text-right text-brand font-bold">{row.avgWpm}</td>
                      <td className="py-2 pl-4 text-right text-slate-400">{row.avgAcc}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {displayedWeakKeys.length > 0 && (
            <div className="p-6 bg-surface-secondary border border-surface-border rounded-xl">
              <div className="font-mono text-xs text-slate-500 uppercase tracking-wide mb-4">Weakest keys</div>
              <div className="space-y-2.5">
                {displayedWeakKeys.map(({ key, accuracy, avgLatency, weaknessScore }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-tertiary border border-surface-border rounded-lg flex items-center justify-center font-mono font-bold text-sm text-slate-300 flex-shrink-0">
                      {key === " " ? "⎵" : key}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                        <span>{accuracy}% accuracy</span>
                        <span>{avgLatency}ms · weak {weaknessScore.toFixed(2)}</span>
                      </div>
                      <div className="bg-surface-tertiary rounded-full h-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${accuracy}%`, background: accuracy >= 95 ? "#4ade80" : accuracy >= 85 ? "#fbbf24" : "#f87171" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {displayedStrongKeys.length > 0 && (
            <div className="p-6 bg-surface-secondary border border-surface-border rounded-xl">
              <div className="font-mono text-xs text-slate-500 uppercase tracking-wide mb-4">Strongest keys</div>
              <div className="space-y-2.5">
                {displayedStrongKeys.map(({ key, accuracy, avgLatency }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-tertiary border border-surface-border rounded-lg flex items-center justify-center font-mono font-bold text-sm text-correct shrink-0">
                      {key}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                        <span>{accuracy}% accuracy</span>
                        <span>{avgLatency}ms avg</span>
                      </div>
                      <div className="bg-surface-tertiary rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-correct/70 transition-all duration-500"
                          style={{ width: `${accuracy}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {slowBigrams.length > 0 && (
          <div className="p-6 bg-surface-secondary border border-surface-border rounded-xl mb-8">
            <div className="font-mono text-xs text-slate-500 uppercase tracking-wide mb-4">Slowest bigrams</div>
            <div className="space-y-2.5">
              {slowBigrams.map(({ bigram, avgMs }) => (
                <div key={bigram} className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-surface-tertiary border border-surface-border rounded-lg font-mono font-bold text-sm text-slate-300 min-w-[52px] text-center tracking-widest">
                    {bigram}
                  </div>
                  <div className="flex-1 bg-surface-tertiary rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500/60 transition-all duration-500"
                      style={{ width: `${Math.min(100, (avgMs / 500) * 100)}%` }} />
                  </div>
                  <div className="font-mono text-xs text-slate-400 w-14 text-right">{avgMs}ms</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap with view toggle — v3 new */}
        {Object.keys(heatmap).length > 0 && (
          <div className="mb-8 p-6 bg-surface-secondary border border-surface-border rounded-xl overflow-x-auto">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="font-mono text-xs text-slate-500 uppercase tracking-wide">Key heatmap</div>
              <div className="flex items-center gap-1 bg-surface-tertiary border border-surface-border rounded-lg p-1">
                {(["accuracy", "volume", "finger"] as HeatmapView[]).map((v) => (
                  <button key={v} onClick={() => setHeatmapView(v)}
                    className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wide transition-all ${
                      heatmapView === v
                        ? "bg-surface-secondary text-slate-200 border border-surface-border"
                        : "text-slate-500 hover:text-slate-300"
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <KeyboardHeatmap
              heatmap={heatmap}
              showFingerColors={heatmapView === "finger"}
            />
            {heatmapView === "volume" && (
              <p className="text-xs text-slate-600 font-mono mt-3">
                Volume view: darker = more keystrokes recorded for that key.
              </p>
            )}
          </div>
        )}

        {/* AI Drill */}
        <div className="p-6 bg-surface-secondary border border-surface-border rounded-xl mb-8">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-500 uppercase tracking-wide mb-2">
            <Zap size={12} />AI drill generator
          </div>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            Uses Groq (Llama 3) or Gemini Flash to build a custom drill targeting your worst keys and slowest bigrams.
          </p>
          <div className="flex gap-2 flex-wrap mb-4">
            {(["words","sentences","code"] as const).map((m) => (
              <button key={m} onClick={() => handleGenerateDrill(m)} disabled={loadingDrill}
                className="px-4 py-2 border border-surface-border text-slate-300 font-mono text-xs rounded-lg hover:bg-surface-hover disabled:opacity-40 flex items-center gap-1.5 transition-all">
                <Zap size={11} />{loadingDrill ? "Generating…" : `${m} drill`}
              </button>
            ))}
          </div>
          {drillError && (
            <div className="mb-3 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs font-mono text-red-300">
              {drillError}
            </div>
          )}
          {drillText && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-surface-tertiary border border-brand/20 rounded-xl">
              <div className="text-xs font-mono text-brand mb-2 flex items-center gap-1.5">
                <Zap size={11} />Your custom drill
                {drillProviderUsed && (
                  <span className="rounded-md border border-surface-border bg-surface-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    via {drillProviderUsed}
                  </span>
                )}
              </div>
              <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{drillText}</pre>
              <div className="mt-3 flex gap-2 flex-wrap">
                <Link href={`/practice?drill=${encodeURIComponent(drillText)}`}
                  className="px-3 py-1.5 bg-brand text-surface font-mono font-bold text-xs rounded-lg hover:bg-brand-dim">
                  Practice this drill →
                </Link>
                <button onClick={() => navigator.clipboard.writeText(drillText)}
                  className="px-3 py-1.5 border border-surface-border text-slate-400 font-mono text-xs rounded-lg hover:bg-surface-hover">
                  Copy
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Recent sessions */}
        <div>
          <div className="font-mono text-xs text-slate-500 uppercase tracking-wide mb-4">Recent sessions</div>
          <div className="space-y-1.5">
            {sessions.slice(0, 15).map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-4 py-2.5 bg-surface-secondary border border-surface-border rounded-xl font-mono text-xs flex-wrap">
                <span className="text-slate-500 w-28 shrink-0">
                  {new Date(s.timestamp).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-brand/80 font-bold w-16">{s.score.toFixed(1)}</span>
                <span className="text-brand font-bold w-16">{s.wpm} wpm</span>
                <span className="text-slate-400 w-12">{s.accuracy}%</span>
                <span className="text-slate-600 w-20">{s.consistency}% cons.</span>
                <span className="text-slate-600 capitalize w-14">{s.mode}</span>
                <span className="text-slate-600 ml-auto">{Math.round(s.duration)}s</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

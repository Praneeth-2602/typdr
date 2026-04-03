"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { PageLoader } from "@/components/PageLoader";
import { useSession } from "next-auth/react";
import { Crown, Medal, RefreshCw, Trophy, Users, Activity, Target } from "lucide-react";

type LeaderboardRow = {
  userId: string;
  username: string;
  bestScore: number;
  avgWpm: number;
  avgAccuracy: number;
  testsCompleted: number;
  updatedAt: string;
};

type SortKey = "bestScore" | "avgWpm" | "avgAccuracy" | "testsCompleted";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "bestScore", label: "Best score" },
  { key: "avgWpm", label: "Avg WPM" },
  { key: "avgAccuracy", label: "Avg accuracy" },
  { key: "testsCompleted", label: "Tests completed" },
];

function rankBadge(index: number) {
  if (index === 0) return <Crown size={14} className="text-yellow-300" />;
  if (index === 1) return <Medal size={14} className="text-slate-300" />;
  if (index === 2) return <Medal size={14} className="text-amber-500" />;
  return <span className="text-slate-500 font-mono text-xs">#{index + 1}</span>;
}

export default function LeaderboardPage() {
  const { status } = useSession();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("bestScore");

  const fetchLeaderboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/leaderboard?limit=100", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load leaderboard.");
      }
      setRows(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const primary = b[sortBy] - a[sortBy];
      if (primary !== 0) return primary;
      return b.bestScore - a.bestScore;
    });
    return copy;
  }, [rows, sortBy]);

  const totalPlayers = sortedRows.length;
  const avgOfTop10Wpm =
    sortedRows.length > 0
      ? (sortedRows.slice(0, 10).reduce((acc, row) => acc + row.avgWpm, 0) / Math.min(sortedRows.length, 10)).toFixed(1)
      : "0.0";
  const topScore = sortedRows[0]?.bestScore?.toFixed(1) ?? "0.0";

  if (status === "loading" || loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
        <Link href="/" className="font-mono font-bold text-base tracking-tight">
          <span className="text-brand">typ</span><span className="text-sky-400">dr</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link href="/learn" className="hover:text-slate-200">Learn</Link>
          <Link href="/practice" className="hover:text-slate-200">Practice</Link>
          <Link href="/analytics" className="hover:text-slate-200">Analytics</Link>
          <AuthButtons />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div>
            <h1 className="font-mono font-bold text-2xl text-slate-100 mb-1">Global leaderboard</h1>
            <p className="text-xs font-mono text-slate-500">Live ranking across synced users</p>
          </div>
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-border text-slate-300 hover:bg-surface-hover font-mono text-xs disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-2"><Users size={12} />Players</div>
            <div className="font-mono font-bold text-2xl text-slate-100">{totalPlayers}</div>
          </div>
          <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-2"><Trophy size={12} />Top score</div>
            <div className="font-mono font-bold text-2xl text-brand">{topScore}</div>
          </div>
          <div className="p-5 bg-surface-secondary border border-surface-border rounded-xl">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-2"><Activity size={12} />Top 10 avg WPM</div>
            <div className="font-mono font-bold text-2xl text-sky-300">{avgOfTop10Wpm}</div>
          </div>
        </div>

        <div className="mb-6 p-3 bg-surface-secondary border border-surface-border rounded-xl flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-500 mr-1 inline-flex items-center gap-1"><Target size={11} />Sort by</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1.5 rounded-md border font-mono text-xs transition-all ${
                sortBy === opt.key
                  ? "bg-brand text-surface border-brand"
                  : "border-surface-border text-slate-400 hover:text-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {sortedRows.length === 0 ? (
          <div className="p-8 bg-surface-secondary border border-surface-border rounded-xl text-center">
            <div className="text-slate-400 font-mono text-sm">No global entries yet.</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              {sortedRows.slice(0, 3).map((row, index) => (
                <motion.div
                  key={row.userId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="p-4 bg-surface-secondary border border-surface-border rounded-xl"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="inline-flex items-center gap-2 text-sm text-slate-200 font-mono">
                      {rankBadge(index)}
                      {row.username}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{new Date(row.updatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                    <span className="text-brand font-bold">{row.bestScore.toFixed(1)} score</span>
                    <span>{row.avgWpm.toFixed(1)} wpm</span>
                    <span>{row.avgAccuracy.toFixed(1)}%</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="overflow-x-auto p-4 bg-surface-secondary border border-surface-border rounded-xl">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-surface-border">
                    <th className="text-left pb-2 pr-4">rank</th>
                    <th className="text-left pb-2 px-4">user</th>
                    <th className="text-right pb-2 px-4">best score</th>
                    <th className="text-right pb-2 px-4">avg wpm</th>
                    <th className="text-right pb-2 px-4">avg acc</th>
                    <th className="text-right pb-2 pl-4">tests</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, index) => (
                    <tr key={row.userId} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-2 pr-4">{rankBadge(index)}</td>
                      <td className="py-2 px-4 text-slate-300">{row.username}</td>
                      <td className="py-2 px-4 text-right text-brand font-bold">{row.bestScore.toFixed(1)}</td>
                      <td className="py-2 px-4 text-right text-slate-300">{row.avgWpm.toFixed(1)}</td>
                      <td className="py-2 px-4 text-right text-slate-400">{row.avgAccuracy.toFixed(1)}%</td>
                      <td className="py-2 pl-4 text-right text-slate-500">{row.testsCompleted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

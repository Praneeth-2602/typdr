"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Trophy } from "lucide-react";

interface SeasonPayload {
  season: { label: string; name: string };
  daysRemaining: number;
  userRank: {
    rank: number;
    points: number;
    tier: string;
  } | null;
}

export function SeasonBanner({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<SeasonPayload | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/seasons", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as SeasonPayload;
        if (active) setData(json);
      } catch {
        // banner is optional
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!data) return null;

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3"
          : "flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand/20 bg-[radial-gradient(circle_at_top_left,rgba(232,245,92,0.1),transparent_55%)] px-5 py-4"
      }
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
          <Trophy size={15} />
        </div>
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Competitive season
          </div>
          <div className="font-mono text-sm font-bold text-slate-100 truncate">
            {data.season.name}
          </div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-slate-500">
            <CalendarDays size={11} />
            {data.daysRemaining} day{data.daysRemaining === 1 ? "" : "s"} remaining
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {data.userRank ? (
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Your rank
            </div>
            <div className="font-mono text-sm font-bold text-brand">
              #{data.userRank.rank} · {data.userRank.tier}
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              {data.userRank.points} pts
            </div>
          </div>
        ) : (
          <div className="font-mono text-xs text-slate-500">
            Complete a session to join
          </div>
        )}
        <Link
          href="/leaderboard"
          className="rounded-lg border border-surface-border px-3 py-1.5 font-mono text-xs text-slate-300 hover:bg-surface-hover"
        >
          View
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Flame, History, LogOut, Trophy, User, Zap } from "lucide-react";
import { XpBar } from "@/components/gamification/XpBar";
import { useAnalyticsStore } from "@/lib/stores/analytics";

interface ProfileStats {
  sessionsCompleted: number;
  xp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
}

interface ProfileStreak {
  currentStreak: number;
  longestStreak: number;
}

function getInitials(name?: string | null) {
  const trimmed = name?.trim();
  if (!trimmed) return "SK";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "SK";
}

export function AuthButtons() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [profileStreak, setProfileStreak] = useState<ProfileStreak | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const sessions = useAnalyticsStore((state) => state.sessions);
  const topWpm = useAnalyticsStore((state) => state.getTopWpm());
  const bestScore = useAnalyticsStore((state) => state.getBestScore());

  const recentSessions = useMemo(() => sessions.slice(0, 4), [sessions]);
  const initials = getInitials(session?.user?.name);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !session?.user) return;
    let active = true;

    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const [statsRes, streakRes] = await Promise.all([
          fetch("/api/user-stats"),
          fetch("/api/streak"),
        ]);

        const [statsData, streakData] = await Promise.all([
          statsRes.json(),
          streakRes.json(),
        ]);

        if (!statsRes.ok) throw new Error(statsData.error ?? "Failed to load profile stats.");
        if (!streakRes.ok) throw new Error(streakData.error ?? "Failed to load streak.");

        if (!active) return;

        setProfileStats({
          sessionsCompleted: statsData.sessionsCompleted ?? 0,
          xp: statsData.xp ?? 0,
          level: statsData.level ?? 1,
          xpForCurrentLevel: statsData.xpForCurrentLevel ?? 0,
          xpForNextLevel: statsData.xpForNextLevel ?? 100,
        });

        setProfileStreak({
          currentStreak: streakData.currentStreak ?? 0,
          longestStreak: streakData.longestStreak ?? 0,
        });
        setProfileError(null);
      } catch (error) {
        if (!active) return;
        setProfileError(error instanceof Error ? error.message : "Failed to load profile.");
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [open, session?.user?.id]);

  if (status === "loading") {
    return <span className="font-mono text-xs text-slate-500">Loading…</span>;
  }

  if (!session?.user) {
    return (
      <Link
        href="/signin"
        className="px-4 py-1.5 border border-surface-border text-slate-300 font-mono text-xs rounded-md hover:bg-surface-hover"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-secondary text-slate-200 transition-all hover:border-brand/40 hover:bg-surface-hover"
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(232,245,92,0.12),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 font-mono text-[11px] font-bold text-brand">
          {initials}
        </span>
        <span className="absolute -bottom-1 -right-1 rounded-full border border-surface-border bg-surface-secondary p-0.5 text-slate-500">
          <ChevronDown size={10} />
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-[360px] overflow-hidden rounded-3xl border border-surface-border bg-[linear-gradient(180deg,rgba(26,29,35,0.98),rgba(16,18,23,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="border-b border-surface-border/80 bg-[radial-gradient(circle_at_top_left,rgba(232,245,92,0.14),transparent_38%)] px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 font-mono text-lg font-bold text-brand">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Profile</div>
                <div className="mt-1 truncate font-mono text-lg font-bold text-slate-100">{session.user.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-500">
                  <User size={11} />
                  Synced account
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            {loadingProfile ? (
              <div className="rounded-2xl border border-surface-border bg-surface-secondary/70 px-4 py-5 text-center font-mono text-xs text-slate-500">
                Loading profile…
              </div>
            ) : (
              <>
                {profileStats && (
                  <div className="rounded-2xl border border-surface-border bg-surface-secondary/70 p-4">
                    <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                      <Zap size={12} />
                      Level Progress
                    </div>
                    <XpBar
                      xp={profileStats.xp}
                      level={profileStats.level}
                      xpForCurrentLevel={profileStats.xpForCurrentLevel}
                      xpForNextLevel={profileStats.xpForNextLevel}
                      compact
                    />
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-surface-border bg-surface/60 px-3 py-2">
                        <div className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Sessions</div>
                        <div className="mt-1 font-mono text-sm font-bold text-slate-100">{profileStats.sessionsCompleted}</div>
                      </div>
                      <div className="rounded-xl border border-surface-border bg-surface/60 px-3 py-2">
                        <div className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Best WPM</div>
                        <div className="mt-1 font-mono text-sm font-bold text-slate-100">{topWpm}</div>
                      </div>
                      <div className="rounded-xl border border-surface-border bg-surface/60 px-3 py-2">
                        <div className="font-mono text-[10px] uppercase tracking-wide text-slate-500">Best Score</div>
                        <div className="mt-1 font-mono text-sm font-bold text-brand">{bestScore}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/analytics"
                    onClick={() => setOpen(false)}
                    className="rounded-2xl border border-surface-border bg-surface-secondary/70 px-4 py-3 transition-all hover:bg-surface-hover"
                  >
                    <div className="mb-1 flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-slate-500">
                      <Trophy size={12} />
                      Stats
                    </div>
                    <div className="font-mono text-sm text-slate-200">Open analytics</div>
                  </Link>
                  <div className="rounded-2xl border border-surface-border bg-surface-secondary/70 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-slate-500">
                      <Flame size={12} />
                      Streak
                    </div>
                    <div className="font-mono text-sm text-slate-200">
                      {profileStreak?.currentStreak ?? 0} days
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-slate-500">
                      best {profileStreak?.longestStreak ?? 0}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-surface-border bg-surface-secondary/70 p-4">
                  <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                    <History size={12} />
                    Recent History
                  </div>
                  {recentSessions.length > 0 ? (
                    <div className="space-y-2">
                      {recentSessions.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-surface-border/70 bg-surface/50 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs text-slate-200">
                              {new Date(item.timestamp).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-slate-500">
                              {item.mode}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-sm font-bold text-brand">{item.wpm} wpm</div>
                            <div className="text-[11px] text-slate-500">{item.accuracy}% acc</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-surface-border bg-surface/40 px-3 py-4 text-center font-mono text-xs text-slate-500">
                      Complete a few sessions to start building your history.
                    </div>
                  )}
                </div>

                {profileError && (
                  <div className="rounded-2xl border border-red-900/40 bg-red-950/20 px-4 py-3 font-mono text-xs text-red-300">
                    {profileError}
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-surface-border bg-surface-secondary/80 px-4 py-3 font-mono text-sm text-slate-200 transition-all hover:bg-surface-hover"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Flag, Users, ArrowRight } from "lucide-react";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

const GUEST_ID_KEY = "typdr-race-guest-id";
const GUEST_NAME_KEY = "typdr-race-display-name";

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

function resolveIdentity(sessionUsername?: string | null): { userId: string; username: string } {
  if (sessionUsername) {
    return {
      userId: `user_${sessionUsername}`,
      username: sessionUsername,
    };
  }
  const stored = sessionStorage.getItem(GUEST_NAME_KEY);
  let username = stored;
  if (!username) {
    username = window.prompt("Display name for race?", "Guest")?.trim() || "Guest";
    sessionStorage.setItem(GUEST_NAME_KEY, username);
  }
  return { userId: getOrCreateGuestId(), username };
}

export default function RaceLobbyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      const identity = resolveIdentity(session?.user?.name);
      const userId = session?.user?.id ?? identity.userId;
      const username = session?.user?.name ?? identity.username;

      const res = await fetch("/api/race/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create room.");
      router.push(`/race/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create room.");
      setBusy(false);
    }
  };

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter a valid room code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const identity = resolveIdentity(session?.user?.name);
      const userId = session?.user?.id ?? identity.userId;
      const username = session?.user?.name ?? identity.username;

      const res = await fetch(`/api/race/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", userId, username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join room.");
      router.push(`/race/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join room.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
        <Link href="/" className="font-mono font-bold text-base tracking-tight">
          <span className="text-brand">typ</span>
          <span className="text-sky-400">dr</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link href="/practice" className="hover:text-slate-200">
            Practice
          </Link>
          <Link href="/race" className="text-slate-200">
            Race
          </Link>
          <Link href="/leaderboard" className="hover:text-slate-200">
            Leaderboard
          </Link>
          <ThemeSwitcher />
          <AuthButtons />
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-surface-border bg-surface-tertiary font-mono text-xs text-brand">
            <Flag size={11} />
            Multiplayer race · up to 8 players
          </div>

          <h1 className="font-mono font-bold text-3xl text-slate-100 mb-3">Race friends</h1>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed">
            Create a room, share the code, and type the same text head-to-head. No install —
            polling works on serverless.
          </p>

          {error && (
            <div className="mb-6 rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-xs font-mono text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={createRoom}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 mb-4 bg-brand text-surface font-mono font-bold text-sm rounded-lg hover:bg-brand-dim disabled:opacity-50"
          >
            <Users size={15} />
            {busy ? "Creating…" : "Create room"}
            <ArrowRight size={14} />
          </button>

          <div className="flex items-center gap-3 my-6 text-xs font-mono text-slate-600">
            <div className="flex-1 h-px bg-surface-border" />
            or join with code
            <div className="flex-1 h-px bg-surface-border" />
          </div>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              placeholder="T4YPD9"
              maxLength={6}
              className="flex-1 bg-surface-secondary border border-surface-border rounded-lg px-4 py-3 font-mono text-sm text-slate-100 tracking-widest uppercase placeholder-slate-600 focus:outline-none focus:border-brand/50"
            />
            <button
              onClick={joinRoom}
              disabled={busy}
              className="px-5 py-3 border border-surface-border text-slate-300 font-mono text-sm rounded-lg hover:bg-surface-hover disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

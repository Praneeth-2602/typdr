"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Flag, Play, RotateCcw, Trophy, Users } from "lucide-react";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { PageLoader } from "@/components/PageLoader";
import { useRace } from "@/hooks/useRace";
import type { RacePlayer } from "@/lib/server/race";

const GUEST_ID_KEY = "typdr-race-guest-id";
const GUEST_NAME_KEY = "typdr-race-display-name";

const PLAYER_COLORS = [
  "#e8f55c",
  "#60a5fa",
  "#f472b6",
  "#34d399",
  "#fb923c",
  "#a78bfa",
  "#f87171",
  "#22d3ee",
];

function getOrCreateGuestId(): string {
  let id = sessionStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

function useRaceIdentity() {
  const { data: session, status } = useSession();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user?.id) {
      setUserId(session.user.id);
      setUsername(session.user.name?.trim() || "Player");
      setReady(true);
      return;
    }

    let name = sessionStorage.getItem(GUEST_NAME_KEY);
    if (!name) {
      name = window.prompt("Display name for race?", "Guest")?.trim() || "Guest";
      sessionStorage.setItem(GUEST_NAME_KEY, name);
    }
    setUserId(getOrCreateGuestId());
    setUsername(name);
    setReady(true);
  }, [session, status]);

  return { ready, userId, username, authStatus: status };
}

function CountdownOverlay({ endsAt }: { endsAt: number }) {
  const [n, setN] = useState(3);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setN(left);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [endsAt]);

  if (n <= 0) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
      <motion.div
        key={n}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-mono font-bold text-8xl text-brand"
      >
        {n}
      </motion.div>
    </div>
  );
}

function ProgressRails({
  players,
  textLength,
  meId,
}: {
  players: RacePlayer[];
  textLength: number;
  meId: string;
}) {
  return (
    <div className="w-full max-w-4xl space-y-3 mb-8">
      {players.map((p, i) => {
        const pct = textLength > 0 ? Math.min(100, (p.progress / textLength) * 100) : 0;
        const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
        const isMe = p.userId === meId;
        return (
          <div key={p.userId} className="relative">
            <div className="flex items-center justify-between mb-1 text-xs font-mono">
              <span style={{ color }} className={isMe ? "font-bold" : ""}>
                {p.username}
                {isMe ? " (you)" : ""}
                {p.finished ? " ✓" : ""}
              </span>
              <span className="text-slate-500">
                {p.wpm} wpm · {p.accuracy}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-tertiary border border-surface-border overflow-visible relative">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, background: color }}
              />
              <span
                className="absolute -top-5 text-[10px] font-mono font-bold whitespace-nowrap transition-all duration-300"
                style={{
                  left: `min(${pct}%, calc(100% - 4rem))`,
                  color,
                  transform: "translateX(-50%)",
                }}
              >
                {p.username.slice(0, 10)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RaceTyping({
  text,
  active,
  onProgress,
  onFinish,
}: {
  text: string;
  active: boolean;
  onProgress: (progress: number, wpm: number, accuracy: number) => void;
  onFinish: (wpm: number, accuracy: number, progress: number) => void;
}) {
  const [typed, setTyped] = useState("");
  const startedAt = useRef(0);
  const finishedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastReport = useRef(0);

  useEffect(() => {
    setTyped("");
    finishedRef.current = false;
    startedAt.current = 0;
    lastReport.current = 0;
    if (active) setTimeout(() => inputRef.current?.focus(), 50);
  }, [text, active]);

  const computeStats = useCallback(
    (val: string) => {
      const elapsed = Math.max(0.001, (Date.now() - (startedAt.current || Date.now())) / 60000);
      const correct = val.split("").filter((c, i) => c === text[i]).length;
      const wpm = Math.round(correct / 5 / elapsed);
      const accuracy = val.length > 0 ? Math.round((correct / val.length) * 100) : 100;
      return {
        progress: Math.min(val.length, text.length),
        wpm: Math.min(999, Math.max(0, wpm)),
        accuracy,
      };
    },
    [text]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!active || finishedRef.current) return;
    const val = e.target.value.slice(0, text.length);
    if (!startedAt.current && val.length > 0) startedAt.current = Date.now();
    setTyped(val);

    const stats = computeStats(val);
    const now = Date.now();
    if (now - lastReport.current >= 400) {
      lastReport.current = now;
      onProgress(stats.progress, stats.wpm, stats.accuracy);
    }

    if (val.length >= text.length) {
      finishedRef.current = true;
      onFinish(stats.wpm, stats.accuracy, text.length);
    }
  };

  return (
    <div className="w-full max-w-4xl relative">
      <div
        className="font-mono text-xl leading-relaxed tracking-wide select-none break-words"
        onClick={() => inputRef.current?.focus()}
      >
        {text.split("").map((ch, i) => {
          let cls = "text-slate-600";
          if (i < typed.length) {
            cls = typed[i] === ch ? "text-correct" : "text-incorrect";
          } else if (i === typed.length) {
            cls = "text-slate-200 border-b-2 border-brand";
          }
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        disabled={!active}
        className="absolute opacity-0 pointer-events-none"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {!active && (
        <p className="mt-4 text-center text-xs font-mono text-slate-600">Waiting for race to start…</p>
      )}
    </div>
  );
}

function FinishBoard({ players }: { players: RacePlayer[] }) {
  const ranked = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      if (a.finished && b.finished) {
        return (a.finishedAt ?? 0) - (b.finishedAt ?? 0);
      }
      return b.progress - a.progress;
    });
  }, [players]);

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-center gap-2 mb-6 justify-center text-brand font-mono font-bold">
        <Trophy size={18} />
        Finish order
      </div>
      <div className="space-y-2">
        {ranked.map((p, i) => (
          <div
            key={p.userId}
            className="flex items-center gap-4 px-4 py-3 rounded-xl border border-surface-border bg-surface-secondary"
          >
            <span className="font-mono font-bold text-brand w-6">#{i + 1}</span>
            <span className="flex-1 font-mono text-slate-200">{p.username}</span>
            <span className="font-mono text-xs text-slate-400">{p.wpm} wpm</span>
            <span className="font-mono text-xs text-slate-500">{p.accuracy}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RaceRoomPage() {
  const params = useParams();
  const code = typeof params.code === "string" ? params.code.toUpperCase() : "";
  const { ready, userId, username, authStatus } = useRaceIdentity();
  const { room, error, loading, start, reportProgress, finish, rematch, isHost, me } = useRace({
    code: ready ? code : null,
    userId,
    username,
    enabled: ready && Boolean(code),
  });
  const [copied, setCopied] = useState(false);
  const finishedSent = useRef(false);

  useEffect(() => {
    finishedSent.current = false;
  }, [room?.text, room?.status]);

  const copyLink = async () => {
    const url = `${window.location.origin}/race/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleProgress = useCallback(
    (progress: number, wpm: number, accuracy: number) => {
      void reportProgress(progress, wpm, accuracy);
    },
    [reportProgress]
  );

  const handleFinish = useCallback(
    (wpm: number, accuracy: number, progress: number) => {
      if (finishedSent.current) return;
      finishedSent.current = true;
      void finish(wpm, accuracy, progress);
    },
    [finish]
  );

  if (authStatus === "loading" || !ready || (loading && !room)) {
    return <PageLoader />;
  }

  const racing = room?.status === "racing";
  const countdown = room?.status === "countdown";
  const finished = room?.status === "finished" || (me?.finished && room?.players.every((p) => p.finished));

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
        <Link href="/" className="font-mono font-bold text-base tracking-tight">
          <span className="text-brand">typ</span>
          <span className="text-sky-400">dr</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link href="/race" className="hover:text-slate-200">
            Race
          </Link>
          <Link href="/practice" className="hover:text-slate-200">
            Practice
          </Link>
          <ThemeSwitcher />
          <AuthButtons />
        </div>
      </nav>

      {countdown && room.countdownEndsAt && <CountdownOverlay endsAt={room.countdownEndsAt} />}

      <div className="flex-1 flex flex-col items-center px-6 py-10">
        {error && (
          <div className="mb-6 w-full max-w-4xl rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-xs font-mono text-red-300">
            {error}
          </div>
        )}

        {!room && (
          <div className="text-center font-mono text-slate-500 text-sm">
            Room not found.{" "}
            <Link href="/race" className="text-brand hover:underline">
              Create a new race
            </Link>
          </div>
        )}

        {room && (
          <>
            <div className="flex items-center gap-3 mb-8 flex-wrap justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-secondary font-mono text-sm">
                <Flag size={12} className="text-brand" />
                <span className="text-slate-400">room</span>
                <span className="text-brand font-bold tracking-widest">{room.code}</span>
                <button
                  onClick={copyLink}
                  className="ml-1 text-slate-500 hover:text-slate-200"
                  title="Copy link"
                >
                  <Copy size={12} />
                </button>
                {copied && <span className="text-[10px] text-correct">copied</span>}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-secondary font-mono text-xs text-slate-400">
                <Users size={11} />
                {room.players.length}/8 · {room.status}
              </div>
            </div>

            {(racing || countdown) && (
              <ProgressRails players={room.players} textLength={room.text.length} meId={userId} />
            )}

            <AnimatePresence mode="wait">
              {room.status === "waiting" && (
                <motion.div
                  key="lobby"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full max-w-md text-center"
                >
                  <h2 className="font-mono font-bold text-xl text-slate-100 mb-2">Lobby</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    Waiting for players. Share the code <span className="text-brand">{room.code}</span>.
                  </p>
                  <ul className="space-y-2 mb-8 text-left">
                    {room.players.map((p, i) => (
                      <li
                        key={p.userId}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-surface-border bg-surface-secondary font-mono text-sm"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }}
                        />
                        <span className="text-slate-200">
                          {p.username}
                          {p.userId === room.hostId ? " · host" : ""}
                          {p.userId === userId ? " (you)" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {isHost ? (
                    <button
                      onClick={() => void start()}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-surface font-mono font-bold text-sm rounded-lg hover:bg-brand-dim"
                    >
                      <Play size={14} />
                      Start race
                    </button>
                  ) : (
                    <p className="text-xs font-mono text-slate-600">Waiting for host to start…</p>
                  )}
                </motion.div>
              )}

              {(racing || countdown) && !me?.finished && (
                <motion.div
                  key="race"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center"
                >
                  <RaceTyping
                    text={room.text}
                    active={racing && !me?.finished}
                    onProgress={handleProgress}
                    onFinish={handleFinish}
                  />
                </motion.div>
              )}

              {(finished || me?.finished) && (
                <motion.div
                  key="finish"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-6"
                >
                  {me?.finished && !finished && (
                    <p className="font-mono text-sm text-slate-400">You finished — waiting for others…</p>
                  )}
                  <FinishBoard players={room.players} />
                  {isHost && (
                    <button
                      onClick={() => void rematch()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 border border-surface-border text-slate-300 font-mono text-sm rounded-lg hover:bg-surface-hover"
                    >
                      <RotateCcw size={13} />
                      Rematch
                    </button>
                  )}
                  <Link href="/race" className="text-xs font-mono text-slate-600 hover:text-slate-400">
                    ← back to race lobby
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

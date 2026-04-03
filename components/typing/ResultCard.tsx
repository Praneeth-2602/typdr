"use client";

import { useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import {
  RotateCcw,
  Shuffle,
  Zap,
  Flame,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Target,
  Gauge,
  TimerReset,
  TriangleAlert,
  Activity,
  Crosshair,
  WandSparkles,
} from "lucide-react";
import clsx from "clsx";
import type { SessionResult, StreakInfo, WeakKeyStat } from "@/lib/stores/analytics";
import { useAnalyticsStore } from "@/lib/stores/analytics";
import { getSessionWeakKeys } from "@/lib/utils/feedback";
import type { XpGainResult } from "@/lib/server/db";
import { XpResultPanel } from "@/components/gamification/XpResultPanel";

interface ResultCardProps {
  result: SessionResult;
  onRestart: () => void;
  onNewSession?: () => void;
  newSessionLabel?: string;
  onDrill?: () => void;
  syncedWeakKeys?: WeakKeyStat[];
  syncedFeedback?: string[];
  syncedStreak?: StreakInfo | null;
  syncedXp?: XpGainResult | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function perfLabel(wpm: number) {
  if (wpm >= 100) return "Blazing fast 🔥";
  if (wpm >= 80) return "Excellent speed 💪";
  if (wpm >= 60) return "Solid performance";
  if (wpm >= 40) return "Getting there";
  return "Keep practicing";
}

function insightTone(accuracy: number, consistency: number, rawDelta: number) {
  if (accuracy >= 97 && consistency >= 88) return "Clean, controlled run.";
  if (rawDelta > 8) return "Your hands were fast, but errors held the score back.";
  if (consistency < 75) return "Speed was there in bursts. Rhythm is the next unlock.";
  if (accuracy >= 92) return "Strong control. A little more push will convert into speed.";
  return "This run exposed useful weak spots to train next.";
}

function buildInsights(result: SessionResult, recentAverage: number, previousBest: number) {
  const rawDelta = result.rawWpm - result.wpm;
  const versusAverage = recentAverage > 0 ? result.wpm - recentAverage : 0;
  const pbMargin = previousBest > 0 ? result.wpm - previousBest : result.wpm;

  const cards = [
    {
      icon: Gauge,
      title: "Speed read",
      body:
        versusAverage === 0
          ? "This run landed right on your recent average."
          : `${versusAverage > 0 ? "+" : ""}${versusAverage} WPM versus your recent pace.`,
      tone: versusAverage >= 0 ? "good" : "neutral",
    },
    {
      icon: Target,
      title: "Accuracy read",
      body:
        rawDelta > 8
          ? `${rawDelta} WPM leaked through errors. Tightening accuracy will pay off fast.`
          : `Accuracy stayed controlled at ${result.accuracy}%, keeping the score honest.`,
      tone: rawDelta > 8 ? "warn" : "good",
    },
    {
      icon: TimerReset,
      title: "Rhythm read",
      body:
        result.consistency >= 85
          ? `Consistency hit ${result.consistency}%. You held your cadence well.`
          : `Consistency was ${result.consistency}%. Smoother pacing could lift your next score.`,
      tone: result.consistency >= 85 ? "good" : "neutral",
    },
  ];

  if (pbMargin > 0 && previousBest > 0) {
    cards[0] = {
      icon: Sparkles,
      title: "New ceiling",
      body: `You pushed ${pbMargin} WPM past your previous best.`,
      tone: "good",
    };
  }

  return cards;
}

function buildFocusMetrics(result: SessionResult, previousBest: number, recentAverage: number) {
  return [
    {
      id: "speed",
      label: "Speed edge",
      value: `${result.wpm} WPM`,
      detail:
        previousBest > 0 && result.wpm > previousBest
          ? `You beat your old ceiling by ${result.wpm - previousBest} WPM.`
          : recentAverage > 0
            ? `${result.wpm - recentAverage >= 0 ? "+" : ""}${result.wpm - recentAverage} WPM against your recent average.`
            : "This is the pace to anchor future sessions against.",
      icon: Activity,
    },
    {
      id: "accuracy",
      label: "Precision",
      value: `${result.accuracy}%`,
      detail:
        result.rawWpm - result.wpm > 8
          ? `Your speed was there, but ${result.rawWpm - result.wpm} WPM got shaved off by errors.`
          : "Accuracy stayed stable enough to protect the score.",
      icon: Crosshair,
    },
    {
      id: "control",
      label: "Control",
      value: `${result.consistency}%`,
      detail:
        result.consistency >= 85
          ? "Cadence stayed smooth through most of the run."
          : "Pacing swung around a bit. Control is the easiest next gain.",
      icon: WandSparkles,
    },
  ];
}

function buildSessionConsistencySeries(result: SessionResult, points = 32, windowSize = 12) {
  const log = result.keystrokeLog ?? [];
  if (log.length < 2) return [result.wpm];
  const safeWindow = Math.min(windowSize, Math.max(2, log.length));
  const maxStart = Math.max(0, log.length - safeWindow);
  const step = Math.max(1, Math.ceil((maxStart + 1) / points));
  const values: number[] = [];
  for (let start = 0; start <= maxStart; start += step) {
    const end = Math.min(log.length - 1, start + safeWindow - 1);
    const chunk = log.slice(start, end + 1);
    const correctChars = chunk.filter((e) => e.correct).length;
    const elapsedMs = Math.max(1, chunk[chunk.length - 1].timestamp - chunk[0].timestamp);
    const chunkWpm = Math.min(999, Math.round((correctChars / 5) / (elapsedMs / 60000)));
    values.push(Number.isFinite(chunkWpm) ? chunkWpm : 0);
  }
  return values.length ? values : [result.wpm];
}

function buildSparklinePath(values: number[], width: number, height: number) {
  if (values.length <= 1) return `M 0 ${height / 2} L ${width} ${height / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

// ── StatPill ───────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  unit,
  sub,
  accent,
  delay,
}: {
  label: string;
  value: number | string;
  unit?: string;
  sub?: string;
  accent?: "brand" | "correct" | "incorrect" | "default";
  delay?: number;
}) {
  const valueColor =
    accent === "brand" ? "text-brand" :
      accent === "correct" ? "text-correct" :
        accent === "incorrect" ? "text-incorrect" :
          "text-slate-100";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: delay ?? 0, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between gap-3 px-4 py-3.5 bg-surface-secondary border border-surface-border rounded-2xl"
    >
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500 leading-tight">{label}</div>
      <div className="text-right shrink-0">
        <span className={clsx("font-mono font-bold text-xl leading-none", valueColor)}>
          {value}
        </span>
        {unit && <span className="font-mono text-sm text-slate-500 ml-0.5">{unit}</span>}
        {sub && <div className="font-mono text-[10px] text-slate-600 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ResultCard({
  result,
  onRestart,
  onNewSession,
  newSessionLabel = "New practice session",
  onDrill,
  syncedWeakKeys,
  syncedFeedback,
  syncedStreak,
  syncedXp,
}: ResultCardProps) {
  const trend = useAnalyticsStore((s) => s.getAccuracyTrend());
  const sessions = useAnalyticsStore((s) => s.sessions);
  const streak = useAnalyticsStore((s) => s.getStreakInfo());

  const previousSessions = sessions.filter((s) => s.id !== result.id);
  const previousBest = previousSessions.length ? Math.max(...previousSessions.map((s) => s.wpm)) : 0;
  const recentAverage = previousSessions.length
    ? Math.round(previousSessions.slice(0, 10).reduce((t, s) => t + s.wpm, 0) / Math.min(previousSessions.length, 10))
    : 0;
  const isNewPb = result.wpm > previousBest || previousSessions.length === 0;
  const rawDelta = result.rawWpm - result.wpm;
  const accuracyHurt = rawDelta > 8;

  const insights = buildInsights(result, recentAverage, previousBest);
  const bt = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };
  const focusMetrics = buildFocusMetrics(result, previousBest, recentAverage);
  const sessionWeakKeys = syncedWeakKeys ?? getSessionWeakKeys(result, 5);
  const feedback = syncedFeedback ?? result.feedback ?? [];
  const displayStreak = syncedStreak ?? streak;
  const [activeMetric, setActiveMetric] = useState(focusMetrics[0].id);
  const activeFocus = focusMetrics.find((m) => m.id === activeMetric) ?? focusMetrics[0];

  const spotlightX = useMotionValue(50);
  const spotlightY = useMotionValue(50);
  const smoothX = useSpring(spotlightX, { stiffness: 160, damping: 24, mass: 0.5 });
  const smoothY = useSpring(spotlightY, { stiffness: 160, damping: 24, mass: 0.5 });
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${smoothX}% ${smoothY}%, rgba(232,245,92,0.14), transparent 55%)`;

  const consistencySeries = buildSessionConsistencySeries(result, 32, 12);
  const consistencyPath = buildSparklinePath(consistencySeries, 560, 110);
  const consistencyMin = Math.min(...consistencySeries);
  const consistencyMax = Math.max(...consistencySeries);
  const consistencyRange = Math.max(1, consistencyMax - consistencyMin);
  const consistencyLastY = 110 - ((consistencySeries[consistencySeries.length - 1] - consistencyMin) / consistencyRange) * 110;
  const consistencyDelta = consistencySeries.length > 1
    ? consistencySeries[consistencySeries.length - 1] - consistencySeries[0]
    : 0;
  const consistencyAreaPath = consistencyPath + ` L 560 110 L 0 110 Z`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-7xl 2xl:max-w-[92rem] mx-auto"
    >
      {/* PB confetti */}
      {isNewPb && (
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden">
          <div className="relative h-36 w-full max-w-4xl">
            {Array.from({ length: 22 }).map((_, i) => (
              <motion.span key={i}
                initial={{ opacity: 0, y: 0, x: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 1, 0], y: [0, 24 + (i % 3) * 14, 90 + (i % 4) * 12], x: [0, (i % 2 === 0 ? -1 : 1) * (20 + (i % 5) * 10)], rotate: [0, 120, 240], scale: [0.4, 1, 0.9] }}
                transition={{ duration: 1.5, delay: i * 0.04, ease: "easeOut" }}
                className={clsx("absolute top-5 h-2.5 w-2.5 rounded-sm", ["bg-brand", "bg-correct", "bg-amber-400", "bg-sky-400"][i % 4])}
                style={{ left: `${4 + i * 4.4}%` }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500 lg:mb-1">Test complete</div>

      <div
        className="relative rounded-[32px] lg:max-h-[calc(100vh-9rem)]"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          spotlightX.set(((e.clientX - rect.left) / rect.width) * 100);
          spotlightY.set(((e.clientY - rect.top) / rect.height) * 100);
        }}
      >
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute inset-0 z-[5]">
          <motion.div aria-hidden className="absolute h-44 w-44 rounded-full bg-brand/20 blur-3xl"
            animate={{ x: ["5%", "40%", "75%", "55%", "5%"], y: ["10%", "20%", "50%", "70%", "10%"], scale: [1, 1.15, 0.92, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden className="absolute h-28 w-28 rounded-full bg-sky-400/10 blur-3xl"
            animate={{ x: ["72%", "86%", "58%", "72%"], y: ["16%", "50%", "80%", "16%"], scale: [0.86, 1.14, 0.9, 0.86] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} />
        </div>

        <div className="relative z-10 grid grid-cols-12 gap-4 lg:gap-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">

          {/* ══════════════════════════════════════════════════════════════
              ROW 1
              [  HERO WPM — 6 cols, 2 rows  ] [ STAT PILLS — 3 cols ] [ SPARKLINE — grows into row 2 ]
              ══════════════════════════════════════════════════════════════ */}

          {/* HERO — dominant, left-anchored, spans 2 rows */}
          <motion.section layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={bt}
            className="relative z-10 overflow-hidden rounded-[28px] border border-brand/20
              bg-[radial-gradient(circle_at_top_left,rgba(232,245,92,0.16),transparent_32%),linear-gradient(180deg,rgba(27,31,34,0.82),rgba(17,18,24,0.88))]
              p-6 lg:p-4 backdrop-blur-xl col-span-12 md:col-span-6 md:row-span-2">
            <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: spotlight }} />
            <motion.div aria-hidden className="pointer-events-none absolute -right-8 top-6 h-48 w-48 rounded-full border border-brand/12"
              animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} />
            <motion.div aria-hidden className="pointer-events-none absolute -right-2 top-14 h-32 w-32 rounded-full border border-brand/8"
              animate={{ rotate: -360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }} />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-3 lg:mb-2">typdr score</div>
                <div className="flex items-center gap-4 lg:gap-3">
                  {/* WPM ring */}
                  <div className="relative grid h-28 w-28 lg:h-24 lg:w-24 place-items-center rounded-full border border-brand/20 bg-surface/20 shrink-0">
                    <motion.div aria-hidden className="absolute inset-2 rounded-full border border-brand/15"
                      animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} />
                    <motion.div aria-hidden className="absolute inset-[14px] rounded-full border border-brand/10"
                      animate={{ rotate: -360 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }} />
                    <div className="relative text-center">
                      <div className="font-mono text-4xl lg:text-[2rem] font-bold leading-none text-brand">{result.wpm}</div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">wpm</div>
                    </div>
                  </div>
                  {/* Perf label + focus tabs */}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-mono text-2xl lg:text-xl font-bold leading-tight text-slate-100">{perfLabel(result.wpm)}</h2>
                    <div className="mt-3 lg:mt-2 grid grid-cols-3 gap-2">
                      {focusMetrics.map((m) => {
                        const Icon = m.icon;
                        return (
                          <button key={m.id} onClick={() => setActiveMetric(m.id)}
                            className={clsx(
                              "flex min-h-[3.5rem] lg:min-h-[3rem] w-full items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 lg:py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.12em] transition-all",
                              activeMetric === m.id ? "border-brand/30 bg-brand/10 text-brand" : "border-surface-border bg-surface/30 text-slate-500 hover:text-slate-300"
                            )}>
                            <Icon size={11} /><span className="leading-tight">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-600">raw</div>
                <div className="mt-2 font-mono text-2xl lg:text-xl font-bold text-slate-200">{result.rawWpm}</div>
              </div>
            </div>

            {isNewPb && (
              <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 lg:px-3 lg:py-1.5 font-mono text-xs text-brand">
                <Sparkles size={13} />New personal best
                <span className="text-slate-300">+{Math.max(1, result.wpm - previousBest)} WPM</span>
              </motion.div>
            )}

            <p className="text-sm lg:text-[13px] leading-6 lg:leading-5 text-slate-400 max-w-sm">
              {insightTone(result.accuracy, result.consistency, rawDelta)}
            </p>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-900/30 bg-amber-950/20 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-amber-300">
              <Flame size={12} />
              {displayStreak.currentStreak}-day streak
              <span className="text-slate-500 normal-case tracking-normal">best {displayStreak.longestStreak}</span>
            </div>

            <motion.div key={activeFocus.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 rounded-2xl border border-surface-border bg-surface/30 p-4 lg:p-3.5">
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">{activeFocus.label}</div>
                <div className="font-mono text-sm font-bold text-brand">{activeFocus.value}</div>
              </div>
              <p className="text-sm leading-6 text-slate-300">{activeFocus.detail}</p>
            </motion.div>
          </motion.section>

          {/* STAT PILLS — 3 cols, stacked (mirrors "Daily Viewers/Comments/Share" column) */}
          <div className="col-span-12 md:col-span-3 flex flex-col gap-3 lg:gap-2.5">
            <StatPill label="Accuracy" value={result.accuracy} unit="%" accent="brand" delay={0.06} />
            <StatPill label="Consistency" value={result.consistency} unit="%" accent={result.consistency >= 85 ? "correct" : "default"} delay={0.10} />
            <StatPill label="Duration" value={Math.round(result.duration)} unit="s" delay={0.14} />
            <StatPill label="Errors" value={result.incorrectChars}
              accent={result.incorrectChars > 5 ? "incorrect" : "correct"}
              sub={rawDelta > 0 ? `−${rawDelta} wpm cost` : undefined}
              delay={0.18} />
          </div>

          {/* SPARKLINE HERO — 3 cols in row 1, expands visually (mirrors "Total subscribers" wavy card) */}
          <motion.section layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...bt, delay: 0.08 }}
            className="relative col-span-12 md:col-span-3 md:row-span-2 rounded-[28px] border border-surface-border bg-surface-secondary/70 backdrop-blur-xl overflow-hidden flex flex-col min-h-[18rem] lg:min-h-[16rem]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(232,245,92,0.07),transparent_60%)]" />
            <div className="relative p-5 lg:p-4 pb-2 flex-1">
              <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-3">Session consistency</div>
              <div className="font-mono text-5xl lg:text-4xl font-bold text-brand leading-none mb-1">
                {result.consistency}<span className="text-2xl text-slate-500 ml-1">%</span>
              </div>
              <div className={clsx(
                "inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-full border mt-2",
                consistencyDelta >= 0 ? "text-correct bg-green-950/30 border-green-900/30" : "text-incorrect bg-red-950/30 border-red-900/30"
              )}>
                {consistencyDelta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {consistencyDelta >= 0 ? "+" : ""}{consistencyDelta} wpm
              </div>
              <div className="mt-3 font-mono text-[10px] text-slate-600">{consistencySeries.length} segments · {consistencyMin}–{consistencyMax} wpm</div>
            </div>
            {/* Full-bleed wave — exactly the wavy area shape from the reference */}
            <svg viewBox="0 0 560 140" className="w-full mt-auto" preserveAspectRatio="none" style={{ height: "120px", display: "block" }}>
              <defs>
                <linearGradient id="areaFill2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(232,245,92,0.20)" />
                  <stop offset="100%" stopColor="rgba(232,245,92,0.03)" />
                </linearGradient>
                <linearGradient id="lineGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(148,163,184,0.35)" />
                  <stop offset="100%" stopColor="rgba(232,245,92,0.95)" />
                </linearGradient>
              </defs>
              <path d={consistencyAreaPath} fill="url(#areaFill2)" />
              <path d={consistencyPath} fill="none" stroke="url(#lineGrad2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={560} cy={consistencyLastY} r="5" fill="rgba(232,245,92,0.95)" />
            </svg>
          </motion.section>

          {/* ══════════════════════════════════════════════════════════════
              ROW 3 — INSIGHTS  (4+4+4)
              ══════════════════════════════════════════════════════════════ */}
          {insights.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.section key={item.title} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ ...bt, delay: 0.14 + i * 0.05 }}
                className={clsx(
                  "col-span-12 md:col-span-4 rounded-[24px] border p-4 lg:p-3.5",
                  item.tone === "good" && "border-brand/20 bg-brand/5",
                  item.tone === "warn" && "border-amber-900/40 bg-amber-950/20",
                  item.tone === "neutral" && "border-surface-border bg-surface-secondary/70"
                )}>
                <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
                  <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-slate-400">
                    <Icon size={13} />{item.title}
                  </div>
                  <p className="text-sm leading-6 text-slate-200">{item.body}</p>
                </motion.div>
              </motion.section>
            );
          })}

          {/* Accuracy cost banner — only when errors hurt meaningfully */}
          {accuracyHurt && (
            <motion.section layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...bt, delay: 0.26 }}
              className="col-span-12 rounded-[24px] border border-amber-900/40 bg-amber-950/20 px-5 py-3.5 flex items-start gap-3 text-amber-300">
              <TriangleAlert size={15} className="mt-0.5 shrink-0" />
              <p className="text-sm leading-5">
                <strong>{rawDelta} WPM</strong> lost to errors — raw was <strong>{result.rawWpm}</strong>, but control pulled the net to <strong>{result.wpm}</strong>.
              </p>
            </motion.section>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ROW 4 — COACH FEEDBACK (7 or 12) + TREND (5 when feedback exists)
              ══════════════════════════════════════════════════════════════ */}
          {feedback.length > 0 && (
            <motion.section layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...bt, delay: 0.28 }}
              className={clsx(
                "col-span-12 rounded-[28px] border border-sky-900/40 bg-sky-950/20 p-5 lg:p-4",
                Math.abs(trend) >= 3 ? "md:col-span-7" : "md:col-span-12"
              )}>
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-slate-400">Coach feedback</div>
              <div className="space-y-2.5">
                {feedback.map((line) => (
                  <p key={line} className="text-sm lg:text-[13px] leading-6 lg:leading-5 text-slate-300">{line}</p>
                ))}
              </div>
            </motion.section>
          )}

          {Math.abs(trend) >= 3 && (
            <motion.section layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...bt, delay: 0.30 }}
              className={clsx(
                "col-span-12 rounded-[28px] border p-5 lg:p-4 flex flex-col justify-center",
                feedback.length > 0 ? "md:col-span-5" : "md:col-span-12",
                trend > 0 ? "bg-green-950/30 border-green-900/40 text-correct" : "bg-red-950/30 border-red-900/40 text-incorrect"
              )}>
              <div className="mb-2 font-mono text-xs uppercase tracking-[0.24em] text-current/70">Trend</div>
              <div className="flex items-center gap-3 font-mono text-2xl font-bold">
                {trend > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {trend > 0 ? "+" : ""}{trend} WPM
              </div>
              <div className="mt-1 font-mono text-xs text-slate-500">vs your last 10 sessions</div>
            </motion.section>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ROW 5 — XP PANEL (8) + WEAK KEYS (4)
              ══════════════════════════════════════════════════════════════ */}
          {syncedXp && (
            <motion.section layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...bt, delay: 0.32 }}
              className={clsx(
                "col-span-12 rounded-[28px] border border-surface-border bg-surface-secondary/70 p-5 lg:p-4 backdrop-blur-xl",
                sessionWeakKeys.length > 0 ? "md:col-span-8" : "md:col-span-12"
              )}>
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Progress</div>
              <XpResultPanel xp={syncedXp} streak={displayStreak} />
            </motion.section>
          )}

          {sessionWeakKeys.length > 0 && (
            <motion.section layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...bt, delay: 0.34 }}
              className={clsx(
                "col-span-12 rounded-[28px] border border-surface-border bg-surface-secondary/70 p-5 lg:p-4 backdrop-blur-xl",
                syncedXp ? "md:col-span-4" : "md:col-span-12"
              )}>
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.24em] text-slate-500">Weak keys</div>
              <div className="flex flex-wrap gap-2">
                {sessionWeakKeys.map((item) => (
                  <motion.div key={item.key} layout whileHover={{ y: -2 }}
                    className={clsx(
                      "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-sm",
                      item.accuracy < 80 ? "bg-red-950/40 border-red-900/40 text-red-400"
                        : item.accuracy < 92 ? "bg-amber-950/40 border-amber-900/40 text-amber-400"
                          : "bg-surface-tertiary/60 border-surface-border text-slate-400"
                    )}>
                    <span className="font-bold">{item.key}</span>
                    <span className="text-xs">{item.accuracy}%</span>
                    {item.avgLatency > 0 && <span className="text-[10px] text-slate-500">{item.avgLatency}ms</span>}
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

        </div>

        <div className="gap-4 lg:gap-3 lg:max-h-[calc(100vh-9rem)] lg:pr-1 mt-8 lg:mt-6">
          {/* ══════════════════════════════════════════════════════════════
              ROW 6 — ACTIONS (full width)
              ══════════════════════════════════════════════════════════════ */}
          <motion.section layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...bt, delay: 0.38 }}
            className="col-span-12 rounded-[28px] border border-surface-border bg-surface-secondary/70 p-5 lg:p-4 backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center items-center gap-3">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={onRestart}
                  className="flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 lg:px-5 lg:py-2 font-mono text-sm font-bold text-surface transition-all hover:bg-brand-dim hover:shadow-[0_12px_28px_rgba(232,245,92,0.18)]">
                  <RotateCcw size={14} />Try again
                  <kbd className="ml-1 rounded bg-surface/20 px-1 py-0.5 text-[10px]">Esc</kbd>
                </button>
                {onDrill && (
                  <button onClick={onDrill}
                    className="flex items-center gap-2 rounded-lg border border-surface-border px-6 py-2.5 lg:px-5 lg:py-2 font-mono text-sm text-slate-300 transition-all hover:bg-surface-hover hover:-translate-y-0.5">
                    <Zap size={14} />AI drill for weak keys
                  </button>
                )}
              </div>
              {onNewSession && (
                <button onClick={onNewSession}
                  className="flex items-center gap-2 rounded-lg border border-surface-border px-6 py-2.5 lg:px-5 lg:py-2 font-mono text-sm text-slate-300 transition-all hover:bg-surface-hover hover:-translate-y-0.5">
                  <Shuffle size={14} />{newSessionLabel}
                  <span className="ml-1 flex items-center gap-1 text-[10px] text-slate-500">
                    <kbd className="rounded bg-surface-tertiary px-1 py-0.5">Tab</kbd>
                    <span>then</span>
                    <kbd className="rounded bg-surface-tertiary px-1 py-0.5">Enter</kbd>
                  </span>
                </button>
              )}
            </div>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}

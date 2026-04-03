"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/gamification/XpBar.tsx  (Phase 2)
//
// Displays:
//  • Level badge (e.g. "Lv 7")
//  • Animated XP progress bar (current level → next level)
//  • Optional "+N XP" gain flash with level-up burst
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingUp } from "lucide-react";

export interface XpBarProps {
  xp:               number;
  level:            number;
  xpForCurrentLevel: number;
  xpForNextLevel:   number;
  /** If provided, animates a "+N XP" flash on mount */
  xpGained?:        number;
  /** If true, shows a level-up celebration burst */
  leveledUp?:       boolean;
  /** compact = inline mini version (e.g. inside result card) */
  compact?:         boolean;
}

const LEVEL_TITLES: Record<number, string> = {
  1:  "Novice",
  2:  "Apprentice",
  3:  "Typist",
  4:  "Swift",
  5:  "Fluent",
  6:  "Adept",
  7:  "Expert",
  8:  "Master",
  9:  "Grandmaster",
  10: "Legendary",
};

function getLevelTitle(level: number): string {
  if (level <= 0)  return "Novice";
  if (level >= 10) return "Legendary";
  return LEVEL_TITLES[level] ?? `Level ${level}`;
}

function getLevelColor(level: number): string {
  if (level >= 9)  return "#f59e0b"; // amber — legendary
  if (level >= 7)  return "#a78bfa"; // violet — master
  if (level >= 5)  return "#34d399"; // emerald — expert
  if (level >= 3)  return "#60a5fa"; // blue — adept
  return "#e8f55c";                  // brand yellow — beginner
}

export function XpBar({
  xp,
  level,
  xpForCurrentLevel,
  xpForNextLevel,
  xpGained,
  leveledUp,
  compact = false,
}: XpBarProps) {
  const progressRef    = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  const span        = xpForNextLevel - xpForCurrentLevel;
  const earned      = xp - xpForCurrentLevel;
  const pct         = span > 0 ? Math.min(100, Math.round((earned / span) * 100)) : 100;
  const accentColor = getLevelColor(level);

  // Trigger entrance animation once
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (compact) {
    return (
      <div className="flex items-center gap-3 w-full">
        {/* Level pill */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-md font-mono text-xs font-bold shrink-0"
          style={{ background: `${accentColor}22`, color: accentColor }}
        >
          <Zap size={10} />
          Lv {level}
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-2 bg-surface-tertiary rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full"
            style={{ background: accentColor }}
            initial={{ width: 0 }}
            animate={{ width: shown ? `${pct}%` : 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>

        {/* XP label */}
        <div className="text-xs text-slate-500 font-mono shrink-0">
          {earned}<span className="text-slate-700">/{span} XP</span>
        </div>

        {/* +N XP flash */}
        <AnimatePresence>
          {xpGained && (
            <motion.span
              key="xp-flash"
              className="text-xs font-mono font-bold"
              style={{ color: accentColor }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              +{xpGained}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Full version ───────────────────────────────────────────────────────────
  return (
    <div className="relative p-4 bg-surface-secondary border border-surface-border rounded-xl overflow-hidden">

      {/* Level-up burst overlay */}
      <AnimatePresence>
        {leveledUp && (
          <motion.div
            key="levelup-burst"
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)` }}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1.6 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
            <motion.div
              className="relative font-mono font-bold text-2xl"
              style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}` }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            >
              ⚡ LEVEL UP!
            </motion.div>
            <motion.div
              className="relative font-mono text-sm text-slate-300 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              You reached <span style={{ color: accentColor }}>Level {level}</span> · {getLevelTitle(level)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            {level}
          </div>
          <div>
            <div className="font-mono font-bold text-slate-100 text-sm leading-none">
              {getLevelTitle(level)}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Level {level}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <TrendingUp size={11} className="text-slate-500" />
            <span className="font-mono text-xs text-slate-400">{xp} XP total</span>
          </div>
          <AnimatePresence>
            {xpGained && (
              <motion.div
                key="xp-gain"
                className="text-xs font-mono font-bold"
                style={{ color: accentColor }}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
              >
                +{xpGained} this run
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-surface-tertiary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full relative"
          style={{ background: `linear-gradient(90deg, ${accentColor}bb, ${accentColor})` }}
          initial={{ width: 0 }}
          animate={{ width: shown ? `${pct}%` : 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Footer: XP progress label */}
      <div className="flex justify-between mt-1.5 text-xs font-mono text-slate-600">
        <span>{earned} / {span} XP</span>
        <span>{pct}% to Lv {level + 1}</span>
      </div>
    </div>
  );
}

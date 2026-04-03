"use client";

// ─────────────────────────────────────────────────────────────────────────────
// components/gamification/XpResultPanel.tsx  (Phase 2)
//
// Shown inside ResultCard after a session is submitted.
// Displays: XP gained, level bar, level-up celebration.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { XpBar } from "./XpBar";
import type { XpGainResult } from "@/lib/server/db";

interface XpResultPanelProps {
  xp:     XpGainResult;
  streak: { currentStreak: number };
}

export function XpResultPanel({ xp, streak }: XpResultPanelProps) {
  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      {/* XP Bar */}
      <XpBar
        xp={xp.xpTotal}
        level={xp.level}
        xpForCurrentLevel={xp.xpForCurrentLevel}
        xpForNextLevel={xp.xpForNextLevel}
        xpGained={xp.xpGained}
        leveledUp={xp.leveledUp}
      />

      {/* Streak badge (if active) */}
      {streak.currentStreak > 1 && (
        <motion.div
          className="flex items-center gap-2 px-3 py-2 bg-surface-secondary border border-surface-border rounded-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Flame size={14} className="text-orange-400" />
          <span className="font-mono text-sm text-slate-300">
            <span className="font-bold text-orange-400">{streak.currentStreak}-day</span> streak — keep it going!
          </span>
        </motion.div>
      )}

      {/* XP breakdown mini-row */}
      <div className="flex items-center gap-2 text-xs font-mono text-slate-600 px-1">
        <Zap size={10} className="text-brand" />
        <span>
          <span className="text-brand">+{xp.xpGained} XP</span> earned this session
          {xp.leveledUp && (
            <span className="text-yellow-400 ml-2">· leveled up to {xp.level}!</span>
          )}
        </span>
      </div>
    </motion.div>
  );
}

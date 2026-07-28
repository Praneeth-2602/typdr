"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Star, Circle } from "lucide-react";
import clsx from "clsx";
import {
  CURRICULUM,
  PHASE_META,
  getStarRating,
  isLessonPassed,
  isLessonUnlocked,
  type Lesson,
} from "@/lib/data/curriculum";
import type { LessonProgress } from "@/lib/stores/analytics";

type NodeState = "locked" | "available" | "in-progress" | "complete";

function getNodeState(
  lesson: Lesson,
  progress: LessonProgress | undefined,
  unlocked: boolean
): NodeState {
  if (!unlocked) return "locked";
  if (isLessonPassed(lesson, progress)) return "complete";
  if (progress && progress.attempts > 0) return "in-progress";
  return "available";
}

interface LessonMapProps {
  lessonProgress: Record<string, LessonProgress>;
}

export function LessonMap({ lessonProgress }: LessonMapProps) {
  const phases: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {phases.map((phase) => {
        const lessons = CURRICULUM.filter((l) => l.phase === phase);
        const meta = PHASE_META[phase];
        const completedCount = lessons.filter((l) =>
          isLessonPassed(l, lessonProgress[l.id])
        ).length;

        return (
          <motion.section
            key={phase}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (phase - 1) * 0.06 }}
            className="rounded-xl border border-surface-border bg-surface-secondary/50 p-5"
          >
            <div className="flex items-start justify-between mb-5 gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600 mb-1">
                  Phase {phase}
                </div>
                <h2 className="font-mono font-bold text-slate-100 text-lg">{meta.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
              </div>
              <div className="font-mono text-xs text-slate-500 tabular-nums">
                <span className="text-brand">{completedCount}</span>/{lessons.length}
              </div>
            </div>

            <div className="relative space-y-2">
              {/* Vertical connector */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-surface-border" />

              {lessons.map((lesson, idx) => {
                const progress = lessonProgress[lesson.id];
                const unlocked = isLessonUnlocked(lesson, lessonProgress);
                const state = getNodeState(lesson, progress, unlocked);
                const stars =
                  state === "complete"
                    ? getStarRating(
                        progress!.bestWpm,
                        lesson.targetWpm,
                        true
                      )
                    : 0;

                return (
                  <LessonNode
                    key={lesson.id}
                    lesson={lesson}
                    state={state}
                    progress={progress}
                    stars={stars}
                    index={idx}
                  />
                );
              })}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}

function LessonNode({
  lesson,
  state,
  progress,
  stars,
  index,
}: {
  lesson: Lesson;
  state: NodeState;
  progress?: LessonProgress;
  stars: number;
  index: number;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={clsx(
        "relative flex items-center gap-4 p-3 rounded-lg border transition-all",
        state === "locked" &&
          "border-transparent opacity-45 cursor-not-allowed",
        state === "available" &&
          "border-surface-border bg-surface hover:border-brand/40 cursor-pointer",
        state === "in-progress" &&
          "border-amber-900/40 bg-amber-950/10 hover:border-amber-700/50 cursor-pointer",
        state === "complete" &&
          "border-brand/20 bg-brand/5 hover:border-brand/40 cursor-pointer"
      )}
    >
      {/* Status icon */}
      <div
        className={clsx(
          "relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border",
          state === "locked" && "bg-surface-tertiary border-surface-border text-slate-600",
          state === "available" && "bg-surface-tertiary border-slate-600 text-slate-400",
          state === "in-progress" && "bg-amber-950/40 border-amber-700/50 text-amber-400",
          state === "complete" && "bg-brand/20 border-brand/40 text-brand"
        )}
      >
        {state === "locked" && <Lock size={12} />}
        {state === "available" && <Circle size={12} />}
        {state === "in-progress" && (
          <span className="w-3 h-3 rounded-full border-2 border-amber-400 border-r-transparent" />
        )}
        {state === "complete" && (
          <span className="text-[10px] font-bold">✓</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-600 uppercase">
            {lesson.id}
          </span>
          {state === "complete" && (
            <span className="flex items-center gap-0.5">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  size={10}
                  className={clsx(
                    s <= stars ? "text-brand fill-brand" : "text-slate-700"
                  )}
                />
              ))}
            </span>
          )}
        </div>
        <div className="font-mono font-bold text-sm text-slate-100 truncate">
          {lesson.title}
        </div>
        {(state === "complete" || state === "in-progress") && progress && (
          <div className="flex items-center gap-3 mt-0.5 text-[10px] font-mono text-slate-500">
            <span className="text-brand">{progress.bestWpm} wpm</span>
            <span>{progress.bestAccuracy}% acc</span>
            <span>{progress.attempts}×</span>
          </div>
        )}
      </div>

      <div className="text-right text-[10px] font-mono text-slate-600 flex-shrink-0 hidden sm:block">
        <div>{lesson.targetWpm} wpm</div>
        <div>{lesson.estimatedMinutes} min</div>
      </div>
    </motion.div>
  );

  if (state === "locked") return content;
  return <Link href={`/learn/${lesson.id}`}>{content}</Link>;
}

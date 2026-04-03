"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckCircle, Lock, ChevronRight, ArrowLeft } from "lucide-react";
import { AuthButtons } from "@/components/auth/AuthButtons";
import { PageLoader } from "@/components/PageLoader";
import { KeyboardHeatmap } from "@/components/keyboard/KeyboardHeatmap";
import { TypingBox } from "@/components/typing/TypingBox";
import { LESSONS } from "@/lib/data/corpus";
import { useAnalyticsStore } from "@/lib/stores/analytics";
import type { SessionResult } from "@/lib/stores/analytics";

export default function LearnPage() {
  const { status } = useSession();

  const lessonProgress = useAnalyticsStore((s) => s.lessonProgress);
  const updateLesson = useAnalyticsStore((s) => s.updateLesson);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [textIdx, setTextIdx] = useState(0);
  const [testKey, setTestKey] = useState(0);
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [passed, setPassed] = useState(false);

  if (status === "loading") {
    return <PageLoader />;
  }

  const activeLesson = LESSONS.find((l) => l.id === activeLessonId);
  const currentText = activeLesson?.texts[textIdx] ?? "";

  function isUnlocked(lessonIdx: number): boolean {
    if (lessonIdx === 0) return true;
    const prevLesson = LESSONS[lessonIdx - 1];
    return !!lessonProgress[prevLesson.id];
  }

  function handleComplete(result: SessionResult) {
    setLastResult(result);
    const lesson = activeLesson!;
    const didPass =
      result.wpm >= lesson.targetWpm && result.accuracy >= lesson.targetAccuracy;
    setPassed(didPass);

    const existing = lessonProgress[lesson.id];
    updateLesson({
      lessonId: lesson.id,
      completedAt: Date.now(),
      bestWpm: Math.max(result.wpm, existing?.bestWpm ?? 0),
      bestAccuracy: Math.max(result.accuracy, existing?.bestAccuracy ?? 0),
      attempts: (existing?.attempts ?? 0) + 1,
    });
  }

  function handleNextText() {
    if (!activeLesson) return;
    if (textIdx < activeLesson.texts.length - 1) {
      setTextIdx((i) => i + 1);
    } else {
      setTextIdx(0);
    }
    setLastResult(null);
    setPassed(false);
    setTestKey((k) => k + 1);
  }

  function handleOpenLesson(id: string) {
    setActiveLessonId(id);
    setTextIdx(0);
    setLastResult(null);
    setPassed(false);
    setTestKey((k) => k + 1);
  }

  function handleBack() {
    setActiveLessonId(null);
    setLastResult(null);
    setPassed(false);
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
        <Link href="/" className="font-mono font-bold text-base tracking-tight">
          <span className="text-brand">typ</span><span className="text-sky-400">dr</span>
        </Link>
        <AuthButtons />
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <Link href="/practice" className="hover:text-slate-200">Practice</Link>
          <Link href="/analytics" className="hover:text-slate-200">Analytics</Link>
          <Link href="/leaderboard" className="hover:text-slate-200">Leaderboard</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!activeLessonId ? (
            /* Lesson list */
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-10">
                <h1 className="font-mono font-bold text-3xl text-slate-100 mb-2">
                  Learn to type
                </h1>
                <p className="text-slate-500 text-sm">
                  Progress through lessons — each one unlocks after you pass the previous.
                </p>
              </div>

              <div className="space-y-3">
                {LESSONS.map((lesson, idx) => {
                  const unlocked = isUnlocked(idx);
                  const progress = lessonProgress[lesson.id];
                  const completed = !!progress;

                  return (
                    <motion.button
                      key={lesson.id}
                      onClick={() => unlocked && handleOpenLesson(lesson.id)}
                      disabled={!unlocked}
                      whileHover={unlocked ? { x: 4 } : {}}
                      className={`w-full flex items-center gap-5 p-5 rounded-xl border text-left transition-all ${
                        unlocked
                          ? "bg-surface-secondary border-surface-border hover:border-slate-600 cursor-pointer"
                          : "bg-surface-tertiary/50 border-surface-border/50 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {/* Level badge */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm flex-shrink-0 ${
                          completed
                            ? "bg-brand/20 text-brand"
                            : unlocked
                            ? "bg-surface-tertiary text-slate-400 border border-surface-border"
                            : "bg-surface-tertiary text-slate-600 border border-surface-border/50"
                        }`}
                      >
                        {completed ? (
                          <CheckCircle size={18} className="text-brand" />
                        ) : unlocked ? (
                          lesson.level
                        ) : (
                          <Lock size={14} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-bold text-slate-100 text-sm mb-0.5">
                          {lesson.title}
                        </div>
                        <div className="text-xs text-slate-500">{lesson.desc}</div>
                        {completed && (
                          <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-slate-500">
                            <span className="text-brand">{progress.bestWpm} wpm</span>
                            <span>{progress.bestAccuracy}% acc</span>
                            <span>{progress.attempts} attempts</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right text-xs text-slate-600 font-mono">
                          <div>Goal: {lesson.targetWpm} wpm</div>
                          <div>{lesson.targetAccuracy}% acc</div>
                        </div>
                        {unlocked && (
                          <ChevronRight size={16} className="text-slate-600" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            /* Active lesson */
            <motion.div
              key="lesson"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Lesson header */}
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={handleBack}
                  className="p-2 rounded-lg border border-surface-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <div className="font-mono text-xs text-slate-500 mb-0.5">
                    Lesson {activeLesson!.level}
                  </div>
                  <h2 className="font-mono font-bold text-slate-100 text-xl">
                    {activeLesson!.title}
                  </h2>
                </div>
                <div className="ml-auto text-right text-xs font-mono text-slate-500">
                  <div>Target: <span className="text-brand">{activeLesson!.targetWpm} wpm</span></div>
                  <div>{activeLesson!.targetAccuracy}% accuracy</div>
                </div>
              </div>

              {/* Keyboard overlay */}
              <div className="mb-8 p-5 bg-surface-secondary border border-surface-border rounded-xl overflow-x-auto">
                <div className="text-xs font-mono text-slate-500 mb-4 uppercase tracking-wide">
                  Keys to focus on
                </div>
                <KeyboardHeatmap
                  heatmap={{}}
                  highlightKeys={activeLesson!.highlightKeys}
                  showFingerColors={false}
                />
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-6">
                {activeLesson!.texts.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full flex-1 transition-all ${
                      i < textIdx
                        ? "bg-brand"
                        : i === textIdx
                        ? "bg-brand/50"
                        : "bg-surface-border"
                    }`}
                  />
                ))}
              </div>

              {/* Typing box */}
              <div className="bg-surface-secondary border border-surface-border rounded-xl p-8 mb-6">
                <TypingBox
                  key={testKey}
                  text={currentText}
                  mode="words"
                  duration={0}
                  onComplete={handleComplete}
                  onRestart={() => {
                    setLastResult(null);
                    setPassed(false);
                    setTestKey((k) => k + 1);
                  }}
                />
              </div>

              {/* Result feedback */}
              <AnimatePresence>
                {lastResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-5 rounded-xl border mb-4 ${
                      passed
                        ? "bg-green-950/30 border-green-900/40"
                        : "bg-amber-950/30 border-amber-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <div
                          className={`font-mono font-bold text-sm mb-1 ${
                            passed ? "text-correct" : "text-amber-400"
                          }`}
                        >
                          {passed ? "✓ Passed!" : "Not quite — keep going"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lastResult.wpm} wpm · {lastResult.accuracy}% accuracy
                          {!passed && (
                            <span className="ml-2">
                              (need {activeLesson!.targetWpm} wpm &{" "}
                              {activeLesson!.targetAccuracy}% acc)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setLastResult(null);
                            setPassed(false);
                            setTestKey((k) => k + 1);
                          }}
                          className="px-4 py-2 border border-surface-border text-slate-300 font-mono text-xs rounded-lg hover:bg-surface-hover"
                        >
                          Retry
                        </button>
                        {(passed || textIdx < activeLesson!.texts.length - 1) && (
                          <button
                            onClick={handleNextText}
                            className="px-4 py-2 bg-brand text-surface font-mono font-bold text-xs rounded-lg hover:bg-brand-dim"
                          >
                            {textIdx < activeLesson!.texts.length - 1
                              ? "Next text →"
                              : "Finish lesson →"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

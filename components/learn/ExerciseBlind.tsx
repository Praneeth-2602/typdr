"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { buildSessionResult } from "@/lib/utils/engine";
import { useSound, useSoundPreference } from "@/hooks/useSound";
import type { KeystrokeEvent, SessionResult } from "@/lib/stores/analytics";
import type { LessonExercise } from "@/lib/data/curriculum";

interface ExerciseBlindProps {
  exercise: LessonExercise;
  onComplete: (result: SessionResult) => void;
  onRestart?: () => void;
  resetKey: number;
}

export function ExerciseBlind({
  exercise,
  onComplete,
  onRestart,
  resetKey,
}: ExerciseBlindProps) {
  const text = typeof exercise.content === "string" ? exercise.content : exercise.content.join(" ");

  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [liveAcc, setLiveAcc] = useState(100);

  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const typedRef = useRef("");
  const keystrokeLogRef = useRef<KeystrokeEvent[]>([]);

  const { enabled: soundEnabled } = useSoundPreference();
  const { play } = useSound(soundEnabled);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    play("testDone");
    const endTime = Date.now();
    const result = buildSessionResult({
      mode: "words",
      startTime: startTimeRef.current,
      endTime,
      typedText: typedRef.current,
      targetText: text,
      keystrokeLog: keystrokeLogRef.current,
      wpmChunks: [],
    });
    onComplete(result);
  }, [text, onComplete, play]);

  const handleRestart = useCallback(() => {
    finishedRef.current = false;
    typedRef.current = "";
    keystrokeLogRef.current = [];
    setTyped("");
    setStarted(false);
    setFinished(false);
    setLiveAcc(100);
    onRestart?.();
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [onRestart]);

  useEffect(() => {
    handleRestart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleRestart();
      return;
    }
    if (finishedRef.current) return;
    if (!started && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      setStarted(true);
      startTimeRef.current = Date.now();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (finishedRef.current) return;
    const val = e.target.value;
    if (val.length > text.length) return;

    if (val.length > typedRef.current.length) {
      const timestamp = Date.now();
      const newChar = val[val.length - 1];
      const expected = text[val.length - 1] ?? "";
      const correct = newChar === expected;
      const prev = keystrokeLogRef.current[keystrokeLogRef.current.length - 1]?.timestamp;
      keystrokeLogRef.current.push({
        expectedChar: expected,
        typedChar: newChar,
        timestamp,
        correct,
        latencyMs: typeof prev === "number" ? Math.max(0, timestamp - prev) : null,
      });
      play(correct ? "keyClick" : "keyError");
    }

    typedRef.current = val;
    setTyped(val);

    const correct = val.split("").filter((c, i) => c === text[i]).length;
    setLiveAcc(val.length > 0 ? Math.round((correct / val.length) * 100) : 100);

    if (val.length >= text.length) setTimeout(finish, 250);
  };

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {exercise.instructions && (
        <p className="text-xs font-mono text-slate-500 mb-4">{exercise.instructions}</p>
      )}

      <div className="flex items-center justify-between mb-4 font-mono text-sm h-8">
        <span className="text-slate-500">
          Blind mode — typed chars hidden
        </span>
        <span>
          <span
            className={clsx(
              "font-bold text-lg",
              liveAcc >= 95 ? "text-correct" : liveAcc >= 85 ? "text-brand" : "text-incorrect"
            )}
          >
            {liveAcc}
          </span>
          <span className="text-slate-500 ml-1">%</span>
        </span>
      </div>

      {/* Target text visible */}
      <div className="mb-4 px-4 py-3 rounded-xl border border-surface-border/50 bg-surface-tertiary/30 font-mono text-sm text-slate-500 leading-relaxed">
        {text}
      </div>

      {/* Blind typed area */}
      <div
        className="relative min-h-[8rem] overflow-hidden rounded-[28px] border border-surface-border bg-[linear-gradient(180deg,rgba(30,33,39,0.92),rgba(18,19,24,0.98))] px-6 py-7 font-mono text-2xl tracking-[0.15em] select-none cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence>
          {!started && !finished && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-6 text-slate-600 text-sm pointer-events-none tracking-normal"
            >
              Start typing blind…
            </motion.span>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-y-2">
          {text.split("").map((char, i) => {
            const isTyped = i < typed.length;
            const isCursor = i === typed.length;
            return (
              <span key={i} className="relative inline-block min-w-[0.6em]">
                {isCursor && (
                  <span className="absolute left-0 top-[3px] bottom-[3px] w-[2px] bg-cursor rounded-sm animate-blink" />
                )}
                <span
                  className={clsx(
                    isTyped ? "text-slate-300" : "text-slate-700"
                  )}
                >
                  {char === " " ? "\u00A0" : isTyped ? "•" : "·"}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute -z-10 w-px h-px"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Blind typing"
      />

      <p className="mt-4 text-center text-xs font-mono text-slate-600">
        Characters hidden as bullets · Esc to restart
      </p>
    </div>
  );
}

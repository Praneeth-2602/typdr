"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { buildSessionResult } from "@/lib/utils/engine";
import { useMetronome } from "@/hooks/useMetronome";
import { useSound, useSoundPreference } from "@/hooks/useSound";
import type { KeystrokeEvent, SessionResult } from "@/lib/stores/analytics";
import type { LessonExercise } from "@/lib/data/curriculum";

interface ExerciseMetronomeProps {
  exercise: LessonExercise;
  onComplete: (result: SessionResult) => void;
  onRestart?: () => void;
  resetKey: number;
}

export function ExerciseMetronome({
  exercise,
  onComplete,
  onRestart,
  resetKey,
}: ExerciseMetronomeProps) {
  const text = typeof exercise.content === "string" ? exercise.content : exercise.content.join(" ");
  const bpm = exercise.bpm ?? 60;

  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [pulseRed, setPulseRed] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const typedRef = useRef("");
  const keystrokeLogRef = useRef<KeystrokeEvent[]>([]);
  const lastBeatTypedRef = useRef(-1);
  const allowedBeatRef = useRef(0);

  const { beatCount } = useMetronome(bpm, started && !finished);
  const { enabled: soundEnabled } = useSoundPreference();
  const { play } = useSound(soundEnabled);

  // On each beat: if user hasn't typed current char, pulse red
  useEffect(() => {
    if (!started || finished) return;
    if (typedRef.current.length < text.length && lastBeatTypedRef.current < beatCount) {
      // Behind the beat
      setPulseRed(true);
      const t = setTimeout(() => setPulseRed(false), 200);
      return () => clearTimeout(t);
    }
    allowedBeatRef.current = beatCount;
    setWaiting(false);
  }, [beatCount, started, finished, text.length]);

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
    lastBeatTypedRef.current = -1;
    allowedBeatRef.current = 0;
    setTyped("");
    setStarted(false);
    setFinished(false);
    setPulseRed(false);
    setWaiting(false);
    onRestart?.();
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [onRestart]);

  // Reset on key change
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

    // If typing ahead of beat, wait
    if (val.length > typedRef.current.length) {
      if (started && lastBeatTypedRef.current >= allowedBeatRef.current && beatCount > 0) {
        // Ahead — block and wait for next beat
        setWaiting(true);
        // Don't accept the character yet — revert input
        e.target.value = typedRef.current;
        return;
      }

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
      lastBeatTypedRef.current = beatCount;
      setWaiting(false);
    }

    typedRef.current = val;
    setTyped(val);
    if (val.length >= text.length) setTimeout(finish, 250);
  };

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  const cursorPos = typed.length;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {exercise.instructions && (
        <p className="text-xs font-mono text-slate-500 mb-4">{exercise.instructions}</p>
      )}

      <div className="flex items-center justify-between mb-4 font-mono text-sm">
        <div className="flex items-center gap-4">
          <span>
            <span className="text-brand font-bold text-lg">{bpm}</span>
            <span className="text-slate-500 ml-1">bpm</span>
          </span>
          <motion.div
            key={beatCount}
            initial={{ scale: 1.4, opacity: 1 }}
            animate={{ scale: 1, opacity: 0.5 }}
            className={clsx(
              "w-3 h-3 rounded-full",
              pulseRed ? "bg-incorrect" : "bg-brand"
            )}
          />
        </div>
        {waiting && (
          <span className="text-xs text-amber-400">Wait for beat…</span>
        )}
      </div>

      <div
        className={clsx(
          "relative min-h-[10rem] overflow-hidden rounded-[28px] border px-6 py-7 font-mono text-xl leading-[2.5rem] tracking-[0.02em] select-none cursor-text",
          pulseRed ? "border-incorrect/50" : "border-surface-border",
          "bg-[linear-gradient(180deg,rgba(30,33,39,0.92),rgba(18,19,24,0.98))]"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {!started && !finished && (
          <span className="absolute top-4 left-6 text-slate-600 text-sm pointer-events-none">
            Start typing to the beat…
          </span>
        )}

        <div className="flex flex-wrap">
          {text.split("").map((char, i) => {
            const state =
              i >= typed.length
                ? "pending"
                : typed[i] === char
                ? "correct"
                : "incorrect";
            const isCursor = i === cursorPos;
            const isLate = isCursor && pulseRed;

            return (
              <span key={i} className="relative inline-block">
                {isCursor && (
                  <span
                    className={clsx(
                      "absolute left-0 top-[3px] bottom-[3px] w-[2px] rounded-sm animate-blink",
                      isLate ? "bg-incorrect" : "bg-cursor"
                    )}
                  />
                )}
                <span
                  className={clsx(
                    "transition-colors duration-100",
                    state === "correct" && "text-correct",
                    state === "incorrect" && "text-incorrect",
                    state === "pending" && (isLate ? "text-incorrect" : "text-slate-500"),
                    isCursor && isLate && "bg-incorrect/20 rounded-sm"
                  )}
                >
                  {char === " " ? "\u00A0" : char}
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
        aria-label="Metronome typing"
      />

      <p className="mt-4 text-center text-xs font-mono text-slate-600">
        One character per beat · Esc to restart
      </p>
    </div>
  );
}

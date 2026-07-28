"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getKeyInfo } from "@/lib/data/keyboard";
import { FINGER_COLORS } from "@/lib/data/keyboard";
import { buildSessionResult } from "@/lib/utils/engine";
import { KeyboardHeatmap } from "@/components/keyboard/KeyboardHeatmap";
import type { KeystrokeEvent, SessionResult } from "@/lib/stores/analytics";
import type { LessonExercise } from "@/lib/data/curriculum";
import { useSound, useSoundPreference } from "@/hooks/useSound";

const TARGET_HITS = 20;

interface ExerciseGuidedKeyProps {
  exercise: LessonExercise;
  onComplete: (result: SessionResult) => void;
}

export function ExerciseGuidedKey({ exercise, onComplete }: ExerciseGuidedKeyProps) {
  const keys = Array.isArray(exercise.content)
    ? exercise.content
    : exercise.content.split(/\s+/).filter(Boolean);

  const [hitCount, setHitCount] = useState(0);
  const [currentKey, setCurrentKey] = useState(() => keys[0] ?? "a");
  const [flash, setFlash] = useState<"correct" | "incorrect" | null>(null);
  const [finished, setFinished] = useState(false);

  const startTimeRef = useRef(Date.now());
  const keystrokeLogRef = useRef<KeystrokeEvent[]>([]);
  const finishedRef = useRef(false);

  const { enabled: soundEnabled } = useSoundPreference();
  const { play } = useSound(soundEnabled);

  const pickNext = useCallback(() => {
    const next = keys[Math.floor(Math.random() * keys.length)] ?? keys[0];
    setCurrentKey(next);
  }, [keys]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    play("testDone");
    const endTime = Date.now();
    const typed = keystrokeLogRef.current.map((k) => k.typedChar).join("");
    const expected = keystrokeLogRef.current.map((k) => k.expectedChar).join("");
    const result = buildSessionResult({
      mode: "words",
      startTime: startTimeRef.current,
      endTime,
      typedText: typed,
      targetText: expected,
      keystrokeLog: keystrokeLogRef.current,
      wpmChunks: [],
    });
    onComplete(result);
  }, [onComplete, play]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finishedRef.current) return;
      if (e.key === "Escape" || e.key === "Tab" || e.ctrlKey || e.metaKey) return;
      if (e.key.length !== 1) return;

      e.preventDefault();
      const expected = currentKey;
      const correct = e.key === expected || e.key.toLowerCase() === expected.toLowerCase();
      const timestamp = Date.now();
      const prev = keystrokeLogRef.current[keystrokeLogRef.current.length - 1]?.timestamp;
      keystrokeLogRef.current.push({
        expectedChar: expected,
        typedChar: e.key,
        timestamp,
        correct,
        latencyMs: typeof prev === "number" ? Math.max(0, timestamp - prev) : null,
      });

      if (correct) {
        play("keyClick");
        setFlash("correct");
        const nextCount = hitCount + 1;
        setHitCount(nextCount);
        if (nextCount >= TARGET_HITS) {
          finish();
        } else {
          pickNext();
        }
      } else {
        play("keyError");
        setFlash("incorrect");
      }
      setTimeout(() => setFlash(null), 180);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentKey, hitCount, finish, pickNext, play]);

  const keyInfo = getKeyInfo(currentKey.toLowerCase());
  const fingerColor = keyInfo ? FINGER_COLORS[keyInfo.finger] : "#e8f55c";

  return (
    <div className="w-full max-w-xl mx-auto">
      {exercise.instructions && (
        <p className="text-xs font-mono text-slate-500 mb-4 text-center">{exercise.instructions}</p>
      )}

      <div className="flex items-center justify-between mb-6 font-mono text-sm">
        <span className="text-slate-500">
          <span className="text-brand font-bold text-lg">{hitCount}</span>
          <span className="ml-1">/ {TARGET_HITS}</span>
        </span>
        {keyInfo && (
          <span className="text-xs" style={{ color: fingerColor }}>
            {keyInfo.finger.replace("-", " ")}
          </span>
        )}
      </div>

      <div className="h-1 bg-surface-border rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-brand rounded-full"
          animate={{ width: `${(hitCount / TARGET_HITS) * 100}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!finished && (
          <motion.div
            key={currentKey + hitCount}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              backgroundColor:
                flash === "correct"
                  ? "rgba(74, 222, 128, 0.15)"
                  : flash === "incorrect"
                  ? "rgba(248, 113, 113, 0.15)"
                  : "rgba(30, 33, 39, 0.9)",
            }}
            exit={{ scale: 1.1, opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 rounded-2xl border border-surface-border mb-8"
          >
            <div className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-4">
              Press
            </div>
            <div
              className="font-mono font-bold text-6xl tabular-nums"
              style={{ color: flash === "incorrect" ? "#f87171" : fingerColor }}
            >
              {currentKey === " " ? "␣" : currentKey}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto flex justify-center">
        <KeyboardHeatmap
          heatmap={{}}
          highlightKeys={keys.map((k) => k.toLowerCase())}
          activeKey={currentKey.toLowerCase()}
          compact
        />
      </div>
    </div>
  );
}

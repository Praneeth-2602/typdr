"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { buildSessionResult } from "@/lib/utils/engine";
import type { KeystrokeEvent, SessionResult } from "@/lib/stores/analytics";
import type { LessonExercise } from "@/lib/data/curriculum";
import { useSound, useSoundPreference } from "@/hooks/useSound";

interface ExerciseWordRevealProps {
  exercise: LessonExercise;
  onComplete: (result: SessionResult) => void;
}

export function ExerciseWordReveal({ exercise, onComplete }: ExerciseWordRevealProps) {
  const words = Array.isArray(exercise.content)
    ? exercise.content
    : exercise.content.split(/\s+/).filter(Boolean);

  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);
  const startedRef = useRef(false);
  const keystrokeLogRef = useRef<KeystrokeEvent[]>([]);
  const finishedRef = useRef(false);
  const allTypedRef = useRef("");
  const allTargetRef = useRef("");

  const { enabled: soundEnabled } = useSoundPreference();
  const { play } = useSound(soundEnabled);

  const currentWord = words[wordIdx] ?? "";

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    play("testDone");
    const endTime = Date.now();
    const result = buildSessionResult({
      mode: "words",
      startTime: startTimeRef.current || endTime - 1000,
      endTime,
      typedText: allTypedRef.current,
      targetText: allTargetRef.current,
      keystrokeLog: keystrokeLogRef.current,
      wpmChunks: [],
    });
    onComplete(result);
  }, [onComplete, play]);

  const advance = useCallback(
    (typedWord: string) => {
      allTypedRef.current += (allTypedRef.current ? " " : "") + typedWord;
      allTargetRef.current += (allTargetRef.current ? " " : "") + currentWord;

      if (wordIdx >= words.length - 1) {
        finish();
      } else {
        setWordIdx((i) => i + 1);
        setTyped("");
      }
    },
    [currentWord, wordIdx, words.length, finish]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (finishedRef.current) return;
    const val = e.target.value;

    if (!startedRef.current && val.length > 0) {
      startedRef.current = true;
      startTimeRef.current = Date.now();
    }

    // Space advances when word is fully typed (or attempted)
    if (val.endsWith(" ") || val.endsWith("\n")) {
      const word = val.trimEnd();
      // Log remaining chars comparison
      for (let i = typed.length; i < word.length; i++) {
        const timestamp = Date.now();
        const prev = keystrokeLogRef.current[keystrokeLogRef.current.length - 1]?.timestamp;
        keystrokeLogRef.current.push({
          expectedChar: currentWord[i] ?? "",
          typedChar: word[i] ?? "",
          timestamp,
          correct: word[i] === currentWord[i],
          latencyMs: typeof prev === "number" ? Math.max(0, timestamp - prev) : null,
        });
      }
      play(word === currentWord ? "keyClick" : "keyError");
      advance(word);
      return;
    }

    if (val.length > typed.length) {
      const timestamp = Date.now();
      const newChar = val[val.length - 1];
      const expected = currentWord[val.length - 1] ?? "";
      const prev = keystrokeLogRef.current[keystrokeLogRef.current.length - 1]?.timestamp;
      keystrokeLogRef.current.push({
        expectedChar: expected,
        typedChar: newChar,
        timestamp,
        correct: newChar === expected,
        latencyMs: typeof prev === "number" ? Math.max(0, timestamp - prev) : null,
      });
      play(newChar === expected ? "keyClick" : "keyError");
    }

    // Auto-advance when exact match and word complete
    if (val === currentWord) {
      setTyped(val);
      // Wait for space, or auto-advance after brief pause for last word
      if (wordIdx >= words.length - 1) {
        setTimeout(() => advance(val), 200);
      }
      return;
    }

    setTyped(val);
  };

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [wordIdx]);

  return (
    <div className="w-full max-w-xl mx-auto">
      {exercise.instructions && (
        <p className="text-xs font-mono text-slate-500 mb-4 text-center">{exercise.instructions}</p>
      )}

      <div className="flex items-center justify-between mb-6 font-mono text-sm">
        <span className="text-slate-500">
          Word <span className="text-brand font-bold">{Math.min(wordIdx + 1, words.length)}</span>
          <span className="ml-1">/ {words.length}</span>
        </span>
        <span className="text-xs text-slate-600">Space to advance</span>
      </div>

      <div className="flex gap-1 mb-8">
        {words.map((_, i) => (
          <div
            key={i}
            className={clsx(
              "h-1 flex-1 rounded-full transition-colors",
              i < wordIdx ? "bg-brand" : i === wordIdx ? "bg-brand/50" : "bg-surface-border"
            )}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!finished && (
          <motion.div
            key={wordIdx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="min-h-[10rem] flex flex-col items-center justify-center rounded-2xl border border-surface-border bg-[linear-gradient(180deg,rgba(30,33,39,0.92),rgba(18,19,24,0.98))] cursor-text px-6 py-10"
            onClick={() => inputRef.current?.focus()}
          >
            <div className="font-mono text-4xl sm:text-5xl font-bold tracking-wide mb-6 select-none">
              {currentWord.split("").map((char, i) => {
                let color = "text-slate-500";
                if (i < typed.length) {
                  color = typed[i] === char ? "text-correct" : "text-incorrect";
                } else if (i === typed.length) {
                  color = "text-slate-200";
                }
                return (
                  <span key={i} className={clsx("relative inline-block", color)}>
                    {i === typed.length && (
                      <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-cursor animate-blink" />
                    )}
                    {char}
                  </span>
                );
              })}
              {typed.length >= currentWord.length && (
                <span className="relative inline-block w-[2px] h-[1em]">
                  <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-cursor animate-blink" />
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-600">Type the word, then press Space</p>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={handleChange}
        className="opacity-0 absolute -z-10 w-px h-px"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="Type the revealed word"
      />
    </div>
  );
}

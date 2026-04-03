"use client";

// ─────────────────────────────────────────────────────────────────────────────
// TypingBox.tsx  v3
//
// New in v3 (on top of all v2 fixes):
//  + Sound feedback: click on correct, thud on error, chime on finish
//  + Sound toggle button (persisted to localStorage)
//  + Timed mode progress bar (fills from 0→100% as time elapses)
//  + "Start typing" hint now animates in/out cleanly
//  + soundRef passed from props to avoid prop-drilling the hook
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Volume2, VolumeX } from "lucide-react";
import { buildSessionResult } from "@/lib/utils/engine";
import { useAnalyticsStore } from "@/lib/stores/analytics";
import { useSound, useSoundPreference } from "@/hooks/useSound";
import type { KeystrokeEvent, SessionResult } from "@/lib/stores/analytics";

interface TypingBoxProps {
  text: string;
  mode: SessionResult["mode"];
  duration?: number;
  onComplete?: (result: SessionResult) => void;
  onRestart?: () => void;
  showLiveStats?: boolean;
}

type CharState = "pending" | "correct" | "incorrect" | "extra";
type RenderToken = { type: "word" | "space"; start: number; end: number }
                 | { type: "newline"; start: number; end: number };
type RenderLine  = { start: number; end: number };

const MAX_EXTRA_CHARS = 20;
const MAX_VISIBLE_LINES = 5;

function deleteLastWord(str: string): string {
  if (!str) return str;
  const trimmed = str.trimEnd();
  if (trimmed.length < str.length) return trimmed;
  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace === -1 ? "" : trimmed.slice(0, lastSpace + 1);
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-surface-tertiary border border-surface-border px-1.5 py-0.5 rounded text-slate-500 text-[10px]">
      {children}
    </kbd>
  );
}

export function TypingBox({
  text,
  mode,
  duration = 60,
  onComplete,
  onRestart,
  showLiveStats = true,
}: TypingBoxProps) {
  const [typed, setTyped]       = useState("");
  const [started, setStarted]   = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(duration > 0 ? duration : null);
  const [liveWpm, setLiveWpm]   = useState(0);
  const [liveAcc, setLiveAcc]   = useState(100);
  const [capsOn, setCapsOn]     = useState(false);

  const startTimeRef       = useRef<number>(0);
  const finishedRef        = useRef(false);
  const timerRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const typedRef           = useRef("");
  const keystrokeLogRef    = useRef<KeystrokeEvent[]>([]);
  const wpmChunksRef       = useRef<number[]>([]);
  const lastChunkTimeRef   = useRef<number>(0);
  const inputRef           = useRef<HTMLInputElement>(null);
  const addSession         = useAnalyticsStore((s) => s.addSession);

  // ── Sound ────────────────────────────────────────────────────────────────
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundPreference();
  const { play } = useSound(soundEnabled);

  // ── Derived ──────────────────────────────────────────────────────────────
  const charStates: CharState[] = useMemo(
    () => text.split("").map((char, i) =>
      i >= typed.length ? "pending" : typed[i] === char ? "correct" : "incorrect"
    ),
    [text, typed]
  );
  const extraCount = Math.min(Math.max(0, typed.length - text.length), MAX_EXTRA_CHARS);
  const cursorPos  = Math.min(typed.length, text.length + MAX_EXTRA_CHARS);

  // Progress percentage (for timed mode progress bar)
  const progressPct = duration > 0 && started
    ? Math.min(100, ((duration - (timeLeft ?? 0)) / duration) * 100)
    : 0;

  // ── Finish ───────────────────────────────────────────────────────────────
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFinished(true);
    if (timerRef.current) clearInterval(timerRef.current);
    play("testDone");
    const endTime = Date.now();
    const result = buildSessionResult({
      mode,
      startTime: startTimeRef.current,
      endTime,
      typedText: typedRef.current,
      targetText: text,
      keystrokeLog: keystrokeLogRef.current,
      wpmChunks: wpmChunksRef.current,
    });
    addSession(result);
    onComplete?.(result);
  }, [mode, text, addSession, onComplete, play]);

  // ── Timer ────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (finishedRef.current) return;
      const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
      const cur = typedRef.current;
      const correct = cur.split("").filter((c, i) => c === text[i]).length;
      const wpm = Math.round(correct / 5 / (elapsedSec / 60));
      const safeWpm = isFinite(wpm) && wpm >= 0 ? Math.min(wpm, 999) : 0;
      setLiveWpm(safeWpm);
      setLiveAcc(cur.length > 0 ? Math.round((correct / cur.length) * 100) : 100);
      if (elapsedSec - lastChunkTimeRef.current >= 5) {
        wpmChunksRef.current.push(safeWpm);
        lastChunkTimeRef.current = elapsedSec;
      }
      if (duration > 0) {
        const left = Math.max(0, duration - Math.round(elapsedSec));
        setTimeLeft(left);
        if (left === 0) finish();
      }
    }, 250);
  }, [duration, text, finish]);

  // ── Restart ───────────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    finishedRef.current = false;
    typedRef.current    = "";
    keystrokeLogRef.current   = [];
    wpmChunksRef.current      = [];
    lastChunkTimeRef.current  = 0;
    setTyped("");
    setStarted(false);
    setFinished(false);
    setTimeLeft(duration > 0 ? duration : null);
    setLiveWpm(0);
    setLiveAcc(100);
    onRestart?.();
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [duration, onRestart]);

  // ── KeyDown ───────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      setCapsOn(e.getModifierState("CapsLock"));

      if (e.key === "Escape") { e.preventDefault(); handleRestart(); return; }
      if (e.key === "Tab")    { e.preventDefault(); return; }
      if (finishedRef.current) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "Backspace") {
        e.preventDefault();
        const next = deleteLastWord(typedRef.current);
        typedRef.current = next;
        setTyped(next);
        return;
      }

      if (!started && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setStarted(true);
        startTimeRef.current     = Date.now();
        lastChunkTimeRef.current = 0;
        startTimer();
      }
    },
    [started, handleRestart, startTimer]
  );

  // ── Change ────────────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (finishedRef.current) return;
      const val = e.target.value;
      if (val.length > text.length + MAX_EXTRA_CHARS) return;

      if (val.length > typedRef.current.length) {
        const timestamp = Date.now();
        const newChar  = val[val.length - 1];
        const expected = text[val.length - 1] ?? "";
        const correct  = newChar === expected;
        const previousTimestamp = keystrokeLogRef.current[keystrokeLogRef.current.length - 1]?.timestamp;
        const latencyMs =
          typeof previousTimestamp === "number"
            ? Math.max(0, timestamp - previousTimestamp)
            : null;

        keystrokeLogRef.current.push({
          expectedChar: expected,
          typedChar: newChar,
          timestamp,
          correct,
          latencyMs,
        });
        // Sound feedback
        play(correct ? "keyClick" : "keyError");
      }

      typedRef.current = val;
      setTyped(val);
      if (val.length >= text.length) setTimeout(finish, 250);
    },
    [text, finish, play]
  );

  // ── Global focus recovery ──────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finishedRef.current || document.activeElement === inputRef.current) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 50); return () => clearTimeout(t); }, []);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Render helpers ────────────────────────────────────────────────────────
  const allChars  = [...text.split(""), ...typed.slice(text.length, text.length + MAX_EXTRA_CHARS).split("")];
  const allStates: CharState[] = [...charStates, ...Array(extraCount).fill("extra" as CharState)];

  const renderTokens = useMemo<RenderToken[]>(() => {
    const tokens: RenderToken[] = [];
    let i = 0;
    while (i < allChars.length) {
      const char = allChars[i];
      if (char === "\n") { tokens.push({ type: "newline", start: i, end: i + 1 }); i++; continue; }
      const isWS = /\s/.test(char);
      let j = i + 1;
      while (j < allChars.length) {
        const next = allChars[j];
        if (next === "\n") break;
        if (/\s/.test(next) !== isWS) break;
        j++;
      }
      tokens.push({ type: isWS ? "space" : "word", start: i, end: j });
      i = j;
    }
    return tokens;
  }, [allChars]);

  const wrapWidth = mode === "code" ? 34 : 52;
  const renderLines = useMemo<RenderLine[]>(() => {
    const lines: RenderLine[] = [];
    let lineStart = 0, lineEnd = 0, lineLen = 0;
    const push = () => lines.push({ start: lineStart, end: lineEnd });
    for (const token of renderTokens) {
      if (token.type === "newline") { push(); lineStart = lineEnd = token.end; lineLen = 0; continue; }
      const tLen = token.end - token.start;
      if (token.type === "space" && lineLen === 0 && mode !== "code") { lineStart = lineEnd = token.end; continue; }
      if (token.type === "word" && lineLen > 0 && lineLen + tLen > wrapWidth) { push(); lineStart = lineEnd = token.start; lineLen = 0; }
      if (token.type === "space" && lineLen + tLen > wrapWidth) { push(); lineStart = lineEnd = token.end; lineLen = 0; continue; }
      if (lineLen === 0) lineStart = token.start;
      lineEnd = token.end;
      lineLen += tLen;
    }
    push();
    return lines.filter((l, i, a) => i === 0 || l.start !== a[i - 1].start || l.end !== a[i - 1].end);
  }, [mode, renderTokens, wrapWidth]);

  const cursorLine = useMemo(() => {
    const idx = renderLines.findIndex((l) => cursorPos >= l.start && cursorPos <= l.end);
    return idx !== -1 ? idx : Math.max(0, renderLines.length - 1);
  }, [cursorPos, renderLines]);

  const visStart   = Math.max(0, Math.min(cursorLine - 1, Math.max(0, renderLines.length - MAX_VISIBLE_LINES)));
  const visLines   = renderLines.slice(visStart, visStart + MAX_VISIBLE_LINES);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {capsOn && (
        <div className="mb-3 px-3 py-1.5 bg-amber-950/40 border border-amber-800/40 rounded-lg text-xs font-mono text-amber-400 flex items-center gap-2">
          <span>⇪</span> Caps Lock is on — this will cause errors
        </div>
      )}

      {showLiveStats && (
        <div className="flex items-center justify-between mb-4 font-mono text-sm h-8">
          <div className="flex items-center gap-6">
            <span>
              <span className="text-brand font-bold text-lg">{liveWpm}</span>
              <span className="text-slate-500 ml-1">wpm</span>
            </span>
            <span>
              <span className={clsx("font-bold text-lg",
                liveAcc >= 95 ? "text-correct" : liveAcc >= 85 ? "text-brand" : "text-incorrect"
              )}>{liveAcc}</span>
              <span className="text-slate-500 ml-1">%</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Sound toggle */}
            <button
              onClick={toggleSound}
              className="text-slate-600 hover:text-slate-300 transition-colors"
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
              aria-label={soundEnabled ? "Mute typing sounds" : "Enable typing sounds"}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            {timeLeft !== null && (
              <div className={clsx(
                "font-bold text-lg tabular-nums transition-colors duration-300",
                timeLeft <= 10 && started ? "text-incorrect" : "text-slate-400"
              )}>
                {timeLeft}s
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timed progress bar — v3 new */}
      {duration > 0 && (
        <div className="h-[2px] bg-surface-border rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full bg-brand rounded-full"
            style={{ width: `${progressPct}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
      )}

      {/* Typing area */}
      <div
        className="relative min-h-[15rem] overflow-hidden rounded-[28px] border border-surface-border bg-[linear-gradient(180deg,rgba(30,33,39,0.92),rgba(18,19,24,0.98))] px-6 py-7 font-mono text-xl leading-[2.5rem] tracking-[0.02em] select-none cursor-text shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
        onClick={() => inputRef.current?.focus()}
        role="textbox"
        aria-label="Typing area — click to focus"
      >
        <AnimatePresence>
          {!started && !finished && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 left-6 text-slate-600 text-sm pointer-events-none font-mono"
            >
              Start typing…
            </motion.span>
          )}
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
        <div className="mb-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.24em] text-slate-600">
          <span>{mode === "time" ? "Timed flow" : mode}</span>
          <span>{visStart + 1}–{Math.min(renderLines.length, visStart + MAX_VISIBLE_LINES)} / {renderLines.length} lines</span>
        </div>

        <div className="relative h-[12.5rem] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={visStart}
              initial={{ y: 26, opacity: 0.55 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -26, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              {visLines.map((line, li) => {
                const isActive = visStart + li === cursorLine;
                return (
                  <motion.div
                    key={`${line.start}-${line.end}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: isActive ? 1 : 0.78, y: 0 }}
                    transition={{ duration: 0.22, delay: li * 0.035 }}
                    className={clsx("min-h-[2.5rem]", isActive ? "text-slate-100" : "text-slate-300/90")}
                  >
                    {allStates.slice(line.start, line.end).map((state, offset) => {
                      const i = line.start + offset;
                      const char = allChars[i] ?? "";
                      const isCursor = i === cursorPos;
                      return (
                        <span key={i} className="relative inline-block">
                          {isCursor && (
                            <span className="absolute left-0 top-[3px] bottom-[3px] w-[2px] bg-cursor rounded-sm animate-blink" aria-hidden="true" />
                          )}
                          <span className={clsx(
                            "transition-colors duration-100",
                            state === "correct"   && "text-correct",
                            state === "incorrect" && "text-incorrect",
                            state === "pending"   && (isActive ? "text-slate-500" : "text-slate-600"),
                            state === "extra"     && "text-incorrect underline decoration-red-500/60"
                          )}>
                            {char === " " || char === "\n" ? "\u00A0" : char}
                          </span>
                        </span>
                      );
                    })}
                    {cursorPos === line.end && (
                      <span className="relative inline-block w-[2px] h-[1.5em]">
                        <span className="absolute left-0 top-[3px] bottom-[3px] w-[2px] bg-cursor rounded-sm animate-blink" aria-hidden="true" />
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (!finishedRef.current) setTimeout(() => inputRef.current?.focus(), 80); }}
        className="opacity-0 absolute -z-10 w-px h-px overflow-hidden"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        tabIndex={0}
        aria-hidden="true"
      />

      <div className="mt-6 flex items-center justify-center gap-5 text-xs font-mono text-slate-600">
        <span className="flex items-center gap-1.5"><Kbd>Esc</Kbd><span>restart</span></span>
        <span className="flex items-center gap-1.5"><Kbd>Ctrl</Kbd><span>+</span><Kbd>⌫</Kbd><span>delete word</span></span>
      </div>
    </div>
  );
}

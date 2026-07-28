"use client";

import { useRef, useCallback, useEffect, useState } from "react";

/**
 * Web Audio API metronome — schedules short punchy ticks ahead of time.
 * Returns beatCount so UI can pulse on each beat.
 */
export function useMetronome(bpm: number, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const nextBeatRef = useRef<number>(0);
  const schedulerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [beatCount, setBeatCount] = useState(0);
  const [behind, setBehind] = useState(false);

  const tick = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    // Schedule any beats that should fire in the next lookahead window
    while (nextBeatRef.current < now + 0.1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, nextBeatRef.current);
      gain.gain.exponentialRampToValueAtTime(0.001, nextBeatRef.current + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(nextBeatRef.current);
      osc.stop(nextBeatRef.current + 0.05);
      nextBeatRef.current += 60 / bpm;
      setBeatCount((c) => c + 1);
    }
  }, [bpm]);

  useEffect(() => {
    if (!enabled) {
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
        schedulerRef.current = null;
      }
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      setBehind(false);
      return;
    }

    try {
      ctxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      nextBeatRef.current = ctxRef.current.currentTime;
      setBeatCount(0);
      schedulerRef.current = setInterval(tick, (60 / bpm) * 1000 * 0.9);
    } catch {
      // AudioContext unavailable
    }

    return () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    };
  }, [bpm, enabled, tick]);

  const markBehind = useCallback((isBehind: boolean) => {
    setBehind(isBehind);
  }, []);

  return { beatCount, behind, markBehind };
}

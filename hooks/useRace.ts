"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RaceRoom } from "@/lib/server/race";

const LOBBY_POLL_MS = 1000;
const RACE_POLL_MS = 500;

interface UseRaceOptions {
  code: string | null;
  userId: string;
  username: string;
  enabled?: boolean;
}

export function useRace({ code, userId, username, enabled = true }: UseRaceOptions) {
  const [room, setRoom] = useState<RaceRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(code));
  const roomRef = useRef<RaceRoom | null>(null);

  const applyRoom = useCallback((next: RaceRoom) => {
    roomRef.current = next;
    setRoom(next);
  }, []);

  const fetchRoom = useCallback(async () => {
    if (!code) return null;
    const res = await fetch(`/api/race/${encodeURIComponent(code)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load room.");
    applyRoom(data as RaceRoom);
    return data as RaceRoom;
  }, [code, applyRoom]);

  const postAction = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      if (!code) throw new Error("No room code.");
      const res = await fetch(`/api/race/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId, username, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed.");
      applyRoom(data as RaceRoom);
      return data as RaceRoom;
    },
    [code, userId, username, applyRoom]
  );

  const join = useCallback(async () => {
    setError(null);
    try {
      return await postAction("join");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to join.";
      setError(msg);
      throw e;
    }
  }, [postAction]);

  const start = useCallback(async () => {
    setError(null);
    try {
      return await postAction("start");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to start.";
      setError(msg);
      throw e;
    }
  }, [postAction]);

  const reportProgress = useCallback(
    async (progress: number, wpm: number, accuracy: number) => {
      try {
        return await postAction("progress", { progress, wpm, accuracy });
      } catch {
        // Non-fatal during race — next poll will resync
        return null;
      }
    },
    [postAction]
  );

  const finish = useCallback(
    async (wpm: number, accuracy: number, progress?: number) => {
      setError(null);
      try {
        return await postAction("finish", { wpm, accuracy, progress });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to finish.";
        setError(msg);
        throw e;
      }
    },
    [postAction]
  );

  const doRematch = useCallback(async () => {
    setError(null);
    try {
      return await postAction("rematch");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to rematch.";
      setError(msg);
      throw e;
    }
  }, [postAction]);

  // Initial load + join
  useEffect(() => {
    if (!enabled || !code || !userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchRoom();
        if (cancelled) return;
        // Auto-join if not already in room and still waiting
        const current = roomRef.current;
        if (current?.status === "waiting" && !current.players.some((p) => p.userId === userId)) {
          await postAction("join");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load room.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, code, userId, fetchRoom, postAction]);

  // Polling
  useEffect(() => {
    if (!enabled || !code) return;

    const tick = async () => {
      try {
        await fetchRoom();
      } catch {
        // keep last known room
      }
    };

    const status = room?.status;
    const intervalMs =
      status === "racing" || status === "countdown" ? RACE_POLL_MS : LOBBY_POLL_MS;

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [enabled, code, room?.status, fetchRoom]);

  return {
    room,
    error,
    loading,
    join,
    start,
    reportProgress,
    finish,
    rematch: doRematch,
    refresh: fetchRoom,
    isHost: room?.hostId === userId,
    me: room?.players.find((p) => p.userId === userId) ?? null,
  };
}

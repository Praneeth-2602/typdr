// ─────────────────────────────────────────────────────────────────────────────
// lib/queue.ts
//
// Phase 2 job queue. Falls back to an in-process async queue when
// UPSTASH_URL / UPSTASH_TOKEN are not configured. This means the app works
// out-of-the-box without Redis — just drop in Upstash credentials later
// and the behaviour is identical.
//
// Job handlers live in lib/worker/handlers.ts and run in the same Node.js
// process (Next.js API runtime). For true background processing, point the
// worker at a separate Node.js service and share the same Upstash queue.
// ─────────────────────────────────────────────────────────────────────────────

export type JobType =
  | "generate-drill-cache"   // pre-warm a drill for a user after session
  | "update-leaderboard"     // async leaderboard rank recalculation
  | "send-streak-reminder";  // future: email/push nudge

export interface Job<T = unknown> {
  type: JobType;
  payload: T;
  enqueuedAt: number;
}

// ── In-process fallback queue ─────────────────────────────────────────────
const inProcessQueue: Job[] = [];
let workerRunning = false;

async function runInProcessWorker() {
  if (workerRunning) return;
  workerRunning = true;

  // Dynamically import handlers to avoid circular deps at module load time
  const { dispatch } = await import("./worker/handlers");

  while (inProcessQueue.length > 0) {
    const job = inProcessQueue.shift()!;
    try {
      await dispatch(job);
    } catch (err) {
      console.error(`[queue] job ${job.type} failed:`, err);
    }
  }

  workerRunning = false;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function enqueueJob<T>(type: JobType, payload: T): Promise<void> {
  const job: Job<T> = { type, payload, enqueuedAt: Date.now() };

  const upstashUrl   = process.env.UPSTASH_URL;
  const upstashToken = process.env.UPSTASH_TOKEN;

  if (upstashUrl && upstashToken) {
    // Push to Upstash Redis list
    const res = await fetch(`${upstashUrl}/lpush/swiftkeys:jobs`, {
      method:  "POST",
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(job)), // Upstash expects a JSON-string value
    });
    if (!res.ok) {
      console.error("[queue] Upstash enqueue failed, falling back to in-process");
      inProcessQueue.push(job as Job);
      void runInProcessWorker();
    }
  } else {
    // In-process fallback — fire and forget
    inProcessQueue.push(job as Job);
    void runInProcessWorker();
  }
}

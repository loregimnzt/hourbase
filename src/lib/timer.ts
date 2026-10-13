import type { ActiveTimer, ISODateTime, TimeEntryInput, TimerStartInput } from "@/types";

/**
 * Pure timer state machine. All functions take `now` explicitly so they are
 * deterministic and testable. Elapsed time is derived from persisted
 * timestamps — a UI interval only triggers re-renders, it is never the source
 * of truth.
 */

const toMs = (iso: ISODateTime) => new Date(iso).getTime();

export function createTimer(input: TimerStartInput, now: Date, id: string): ActiveTimer {
  const iso = now.toISOString();
  return {
    id,
    ...input,
    startedAt: iso,
    status: "running",
    accumulatedMs: 0,
    segmentStartedAt: iso,
    pausedAt: null,
    updatedAt: iso,
  };
}

/** Active (non-paused) elapsed milliseconds at `now`. Never negative. */
export function getElapsedMs(timer: ActiveTimer, now: Date): number {
  if (timer.status === "paused" || !timer.segmentStartedAt) return Math.max(0, timer.accumulatedMs);
  const running = Math.max(0, now.getTime() - toMs(timer.segmentStartedAt));
  return Math.max(0, timer.accumulatedMs + running);
}

export function pauseTimer(timer: ActiveTimer, now: Date): ActiveTimer {
  if (timer.status === "paused") return timer;
  const iso = now.toISOString();
  return {
    ...timer,
    status: "paused",
    accumulatedMs: getElapsedMs(timer, now),
    segmentStartedAt: null,
    pausedAt: iso,
    updatedAt: iso,
  };
}

export function resumeTimer(timer: ActiveTimer, now: Date): ActiveTimer {
  if (timer.status === "running") return timer;
  const iso = now.toISOString();
  return { ...timer, status: "running", segmentStartedAt: iso, pausedAt: null, updatedAt: iso };
}

/**
 * Convert a timer into a time entry at `now`.
 * The wall-clock span is [startedAt, now]; everything that was not active time
 * is recorded as break time, so duration = span - break = active time.
 * If the timer is paused, the entry ends at the moment it was paused.
 */
export function timerToEntry(timer: ActiveTimer, now: Date): TimeEntryInput {
  const end = timer.status === "paused" && timer.pausedAt ? new Date(timer.pausedAt) : now;
  const activeSeconds = Math.floor(getElapsedMs(timer, end) / 1000);
  // Truncate to whole seconds so span - break is exactly activeSeconds.
  const startMs = Math.floor(toMs(timer.startedAt) / 1000) * 1000;
  const endMs = Math.max(startMs, Math.floor(end.getTime() / 1000) * 1000);
  const spanSeconds = (endMs - startMs) / 1000;
  const breakSeconds = Math.max(0, spanSeconds - activeSeconds);
  return {
    projectId: timer.projectId,
    description: timer.description,
    notes: timer.notes,
    billable: timer.billable,
    startedAt: new Date(startMs).toISOString(),
    endedAt: new Date(endMs).toISOString(),
    breakSeconds,
    source: "timer",
  };
}

/** Format seconds as H:MM:SS (hours not capped at 24). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

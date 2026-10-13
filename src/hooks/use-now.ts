"use client";
import { useEffect, useState } from "react";

const EPOCH = new Date(0);

/**
 * Re-render on an interval and return the current time. This only drives
 * display refreshes; durations are always computed from stored timestamps,
 * so a throttled background tab still shows the correct time when it wakes.
 * Before mount it returns a stable epoch so prerendering stays deterministic.
 */
export function useNow(intervalMs = 1000, enabled = true): Date {
  const [now, setNow] = useState<Date>(() => (typeof window === "undefined" ? EPOCH : new Date()));
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs, enabled]);
  return now;
}

import { describe, expect, it } from "vitest";
import { createTimer, formatClock, getElapsedMs, pauseTimer, resumeTimer, timerToEntry } from "@/lib/timer";
import { entryDurationSeconds } from "@/lib/time";

const t0 = new Date("2026-10-12T09:00:00.000Z");
const at = (sec: number) => new Date(t0.getTime() + sec * 1000);
const start = () => createTimer({ projectId: "p1", description: "Design", notes: null, billable: true }, t0, "timer-1");

describe("timer elapsed time", () => {
  it("derives elapsed time from timestamps, not ticks", () => {
    const t = start();
    expect(getElapsedMs(t, at(0))).toBe(0);
    expect(getElapsedMs(t, at(90))).toBe(90_000);
    // A "refresh" an hour later recomputes from the same stored state.
    const restored = JSON.parse(JSON.stringify(t));
    expect(getElapsedMs(restored, at(3600))).toBe(3_600_000);
  });

  it("freezes while paused and continues after resume", () => {
    let t = start();
    t = pauseTimer(t, at(600)); // 10 min active
    expect(t.status).toBe("paused");
    expect(getElapsedMs(t, at(600))).toBe(600_000);
    expect(getElapsedMs(t, at(5000))).toBe(600_000); // paused time ignored
    t = resumeTimer(t, at(1800)); // 20 min pause
    expect(getElapsedMs(t, at(2400))).toBe(1_200_000); // 10 + 10 min
  });

  it("accumulates across multiple pause/resume cycles", () => {
    let t = start();
    t = pauseTimer(t, at(100));
    t = resumeTimer(t, at(200));
    t = pauseTimer(t, at(300));
    t = resumeTimer(t, at(1000));
    expect(getElapsedMs(t, at(1100))).toBe(300_000);
  });

  it("is idempotent for repeated pause/resume", () => {
    const t = pauseTimer(start(), at(60));
    expect(pauseTimer(t, at(120))).toBe(t);
    const r = resumeTimer(t, at(180));
    expect(resumeTimer(r, at(240))).toBe(r);
  });

  it("never returns negative time when the clock goes backwards", () => {
    expect(getElapsedMs(start(), at(-30))).toBe(0);
  });
});

describe("timerToEntry", () => {
  it("records paused time as break so duration equals active time", () => {
    let t = start();
    t = pauseTimer(t, at(1800)); // 30 min work
    t = resumeTimer(t, at(2700)); // 15 min break
    const entry = timerToEntry(t, at(4500)); // 30 more min
    expect(entry.startedAt).toBe(t0.toISOString());
    expect(entry.endedAt).toBe(at(4500).toISOString());
    expect(entry.breakSeconds).toBe(900);
    expect(entryDurationSeconds(entry)).toBe(3600);
    expect(entry.source).toBe("timer");
  });

  it("ends a paused timer at the moment it was paused", () => {
    const t = pauseTimer(start(), at(1200));
    const entry = timerToEntry(t, at(99999));
    expect(entry.endedAt).toBe(at(1200).toISOString());
    expect(entryDurationSeconds(entry)).toBe(1200);
    expect(entry.breakSeconds).toBe(0);
  });
});

describe("formatClock", () => {
  it("formats H:MM:SS without capping hours", () => {
    expect(formatClock(0)).toBe("0:00:00");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(90000)).toBe("25:00:00");
  });
});

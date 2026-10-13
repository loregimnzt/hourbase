import { describe, expect, it } from "vitest";
import { entryDurationSeconds, entryToManualTimes, formatDuration, getRange, resolveManualTimes } from "@/lib/time";

describe("manual entry duration", () => {
  it("computes duration minus break", () => {
    const r = resolveManualTimes({ date: "2026-10-12", startTime: "09:00", endTime: "12:30", breakMinutes: 30 }, "UTC");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.startedAt).toBe("2026-10-12T09:00:00.000Z");
    expect(r.endedAt).toBe("2026-10-12T12:30:00.000Z");
    expect(r.breakSeconds).toBe(1800);
    expect(r.durationSeconds).toBe(3 * 3600);
    expect(entryDurationSeconds(r)).toBe(3 * 3600);
    expect(r.overnight).toBe(false);
  });

  it("treats an end time before the start as an overnight session", () => {
    const r = resolveManualTimes({ date: "2026-10-12", startTime: "22:00", endTime: "01:30", breakMinutes: 0 }, "UTC");
    expect(r.ok && r.overnight).toBe(true);
    if (!r.ok) return;
    expect(r.endedAt).toBe("2026-10-13T01:30:00.000Z");
    expect(r.durationSeconds).toBe(3.5 * 3600);
  });

  it("interprets wall-clock times in the user's time zone", () => {
    const r = resolveManualTimes({ date: "2026-07-01", startTime: "09:00", endTime: "17:00", breakMinutes: 60 }, "Europe/Madrid");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.startedAt).toBe("2026-07-01T07:00:00.000Z"); // CEST = UTC+2
    expect(r.durationSeconds).toBe(7 * 3600);
    expect(entryToManualTimes(r, "Europe/Madrid")).toEqual({ date: "2026-07-01", startTime: "09:00", endTime: "17:00", breakMinutes: 60 });
  });

  it("rejects equal start/end and breaks that consume the session", () => {
    expect(resolveManualTimes({ date: "2026-10-12", startTime: "09:00", endTime: "09:00", breakMinutes: 0 }, "UTC").ok).toBe(false);
    expect(resolveManualTimes({ date: "2026-10-12", startTime: "09:00", endTime: "10:00", breakMinutes: 60 }, "UTC").ok).toBe(false);
    expect(resolveManualTimes({ date: "2026-10-12", startTime: "09:00", endTime: "10:00", breakMinutes: -5 }, "UTC").ok).toBe(false);
    expect(resolveManualTimes({ date: "bad", startTime: "09:00", endTime: "10:00", breakMinutes: 0 }, "UTC").ok).toBe(false);
    expect(resolveManualTimes({ date: "2026-10-12", startTime: "25:00", endTime: "10:00", breakMinutes: 0 }, "UTC").ok).toBe(false);
  });

  it("formats durations", () => {
    expect(formatDuration(0)).toBe("0m");
    expect(formatDuration(45 * 60)).toBe("45m");
    expect(formatDuration(3 * 3600)).toBe("3h");
    expect(formatDuration(3 * 3600 + 25 * 60)).toBe("3h 25m");
  });
});

describe("date ranges", () => {
  it("respects week start and time zone", () => {
    // Monday 12 Oct 2026, 01:00 in Tokyo is still Sunday 11 Oct in UTC.
    const now = new Date("2026-10-11T16:00:00.000Z");
    const tokyo = getRange("week", { timeZone: "Asia/Tokyo", weekStartsOn: 1, now });
    expect(tokyo.start.toISOString()).toBe("2026-10-11T15:00:00.000Z"); // Mon 00:00 JST
    const utc = getRange("week", { timeZone: "UTC", weekStartsOn: 1, now });
    expect(utc.start.toISOString()).toBe("2026-10-05T00:00:00.000Z");
    const sunday = getRange("week", { timeZone: "UTC", weekStartsOn: 0, now });
    expect(sunday.start.toISOString()).toBe("2026-10-11T00:00:00.000Z");
  });

  it("computes last month", () => {
    const r = getRange("lastMonth", { timeZone: "UTC", weekStartsOn: 1, now: new Date("2026-03-15T12:00:00Z") });
    expect(r.start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-02-28T23:59:59.999Z");
  });
});

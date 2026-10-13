import { TZDate } from "@date-fns/tz";
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { DateFormat, ISODate, ISODateTime, Settings, TimeEntry, TimeFormat, WeekStart } from "@/types";

/* ------------------------------------------------------------------ */
/* Durations                                                           */
/* ------------------------------------------------------------------ */

/** Tracked (billable-or-not) seconds of an entry: span minus breaks. */
export function entryDurationSeconds(entry: Pick<TimeEntry, "startedAt" | "endedAt" | "breakSeconds">): number {
  const span = (new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000;
  return Math.max(0, Math.round(span - entry.breakSeconds));
}

export const secondsToHours = (s: number) => s / 3600;

/** "3h 25m", "45m", "0m". */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(Math.max(0, seconds) / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Decimal hours, e.g. "12.5". */
export function formatHours(seconds: number, digits = 1): string {
  return (seconds / 3600).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

/* ------------------------------------------------------------------ */
/* Manual entry → timestamps                                           */
/* ------------------------------------------------------------------ */

export interface ManualTimes {
  date: ISODate; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakMinutes: number;
}

export type ManualTimesResult =
  | { ok: true; startedAt: ISODateTime; endedAt: ISODateTime; breakSeconds: number; durationSeconds: number; overnight: boolean }
  | { ok: false; error: string };

const parseHM = (v: string): [number, number] | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return [h, min];
};

/**
 * Resolve a manual entry (wall-clock times in the user's time zone) into UTC
 * timestamps. An end time earlier than the start time is treated as an
 * overnight session that ends the following day. Equal times are rejected.
 */
export function resolveManualTimes(input: ManualTimes, timeZone: string): ManualTimesResult {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  if (!d) return { ok: false, error: "Enter a valid date." };
  const start = parseHM(input.startTime);
  const end = parseHM(input.endTime);
  if (!start) return { ok: false, error: "Enter a valid start time." };
  if (!end) return { ok: false, error: "Enter a valid end time." };
  const [y, mo, day] = [Number(d[1]), Number(d[2]) - 1, Number(d[3])];

  const startDate = new TZDate(y, mo, day, start[0], start[1], 0, timeZone);
  let endDate = new TZDate(y, mo, day, end[0], end[1], 0, timeZone);
  let overnight = false;
  if (endDate.getTime() === startDate.getTime()) {
    return { ok: false, error: "End time must be different from start time." };
  }
  if (endDate.getTime() < startDate.getTime()) {
    endDate = new TZDate(addDays(endDate, 1), timeZone);
    overnight = true;
  }
  const spanSeconds = (endDate.getTime() - startDate.getTime()) / 1000;
  const breakMinutes = Number.isFinite(input.breakMinutes) ? input.breakMinutes : 0;
  if (breakMinutes < 0) return { ok: false, error: "Break cannot be negative." };
  const breakSeconds = Math.round(breakMinutes * 60);
  if (breakSeconds >= spanSeconds) {
    return { ok: false, error: "Break must be shorter than the session." };
  }
  return {
    ok: true,
    startedAt: new Date(startDate.getTime()).toISOString(),
    endedAt: new Date(endDate.getTime()).toISOString(),
    breakSeconds,
    durationSeconds: spanSeconds - breakSeconds,
    overnight,
  };
}

/** Inverse of resolveManualTimes, for pre-filling edit forms. */
export function entryToManualTimes(entry: Pick<TimeEntry, "startedAt" | "endedAt" | "breakSeconds">, timeZone: string): ManualTimes {
  const s = new TZDate(new Date(entry.startedAt), timeZone);
  const e = new TZDate(new Date(entry.endedAt), timeZone);
  return {
    date: format(s, "yyyy-MM-dd"),
    startTime: format(s, "HH:mm"),
    endTime: format(e, "HH:mm"),
    breakMinutes: Math.round(entry.breakSeconds / 60),
  };
}

/* ------------------------------------------------------------------ */
/* Ranges (always computed in the user's time zone)                   */
/* ------------------------------------------------------------------ */

export type RangePreset = "today" | "week" | "last7" | "month" | "lastMonth" | "last30" | "custom";

export interface DateRange {
  /** Inclusive start instant. */
  start: Date;
  /** Inclusive end instant. */
  end: Date;
  label: string;
}

export const RANGE_LABELS: Record<RangePreset, string> = {
  today: "Today",
  week: "This week",
  last7: "Last 7 days",
  month: "This month",
  lastMonth: "Last month",
  last30: "Last 30 days",
  custom: "Custom range",
};

export function nowInZone(timeZone: string, now: Date = new Date()): TZDate {
  return new TZDate(now, timeZone);
}

export function getRange(
  preset: RangePreset,
  opts: { timeZone: string; weekStartsOn: WeekStart; now?: Date; customStart?: ISODate; customEnd?: ISODate },
): DateRange {
  // Compute in the user's zone, return plain instants (TZDate#toISOString keeps a local offset).
  const r = computeRange(preset, opts);
  return { start: new Date(r.start.getTime()), end: new Date(r.end.getTime()), label: r.label };
}

function computeRange(
  preset: RangePreset,
  opts: { timeZone: string; weekStartsOn: WeekStart; now?: Date; customStart?: ISODate; customEnd?: ISODate },
): DateRange {
  const now = nowInZone(opts.timeZone, opts.now);
  const label = RANGE_LABELS[preset];
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now), label };
    case "week":
      return {
        start: startOfWeek(now, { weekStartsOn: opts.weekStartsOn }),
        end: endOfWeek(now, { weekStartsOn: opts.weekStartsOn }),
        label,
      };
    case "last7":
      return { start: startOfDay(addDays(now, -6)), end: endOfDay(now), label };
    case "month":
      return { start: startOfMonth(now), end: endOfMonth(now), label };
    case "lastMonth": {
      const prev = subMonths(now, 1);
      return { start: startOfMonth(prev), end: endOfMonth(prev), label };
    }
    case "last30":
      return { start: startOfDay(addDays(now, -29)), end: endOfDay(now), label };
    case "custom": {
      const s = parseDateInZone(opts.customStart, opts.timeZone) ?? startOfDay(addDays(now, -29));
      const e = parseDateInZone(opts.customEnd, opts.timeZone) ?? now;
      const [a, b] = s.getTime() <= e.getTime() ? [s, e] : [e, s];
      return { start: startOfDay(a), end: endOfDay(b), label };
    }
  }
}

function parseDateInZone(date: ISODate | undefined, timeZone: string): TZDate | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  return new TZDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]), timeZone);
}

/** Days of the range as TZDates at local midnight. */
export function daysInRange(range: DateRange, timeZone: string): TZDate[] {
  return eachDayOfInterval({ start: new TZDate(range.start, timeZone), end: new TZDate(range.end, timeZone) });
}

/** "yyyy-MM-dd" key of an instant in the user's zone. */
export function dayKey(instant: Date | ISODateTime, timeZone: string): ISODate {
  return format(new TZDate(new Date(instant), timeZone), "yyyy-MM-dd");
}

export function todayISO(timeZone: string): ISODate {
  return dayKey(new Date(), timeZone);
}

/**
 * Entries are attributed to a period by their start time (a common, simple
 * convention used by most time trackers). An overnight session that starts on
 * Monday counts entirely toward Monday.
 */
export function entryInRange(entry: Pick<TimeEntry, "startedAt">, range: Pick<DateRange, "start" | "end">): boolean {
  const t = new Date(entry.startedAt).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

/* ------------------------------------------------------------------ */
/* Display formatting                                                  */
/* ------------------------------------------------------------------ */

export function formatDate(instant: Date | ISODateTime, settings: Pick<Settings, "timeZone" | "dateFormat">): string {
  return format(new TZDate(new Date(instant), settings.timeZone), settings.dateFormat);
}

/** Format a calendar date ("yyyy-MM-dd") without time-zone shifting. */
export function formatCalendarDate(date: ISODate, dateFormat: DateFormat): string {
  const [y, m, d] = date.split("-").map(Number);
  return format(new Date(y, m - 1, d), dateFormat);
}

export function timePattern(tf: TimeFormat) {
  return tf === "12h" ? "h:mm a" : "HH:mm";
}

export function formatTime(instant: Date | ISODateTime, settings: Pick<Settings, "timeZone" | "timeFormat">): string {
  return format(new TZDate(new Date(instant), settings.timeZone), timePattern(settings.timeFormat));
}

export function formatInZone(instant: Date | ISODateTime, timeZone: string, pattern: string): string {
  return format(new TZDate(new Date(instant), timeZone), pattern);
}

export function greetingFor(timeZone: string, now: Date = new Date()): string {
  const h = nowInZone(timeZone, now).getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function listTimeZones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (fn) return fn("timeZone");
  } catch {
    /* fall through */
  }
  return ["UTC", "Europe/London", "Europe/Madrid", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Mexico_City", "America/Sao_Paulo", "Asia/Tokyo", "Australia/Sydney"];
}

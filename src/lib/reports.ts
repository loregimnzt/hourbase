import { TZDate } from "@date-fns/tz";
import { format, startOfWeek } from "date-fns";
import type { Project, Settings, TimeEntry } from "@/types";
import { type DateRange, daysInRange, dayKey, entryDurationSeconds, entryInRange } from "./time";

export interface HoursPoint {
  key: string;
  label: string;
  fullLabel: string;
  billable: number; // seconds
  nonBillable: number; // seconds
}

/** Daily buckets for ranges up to ~6 weeks, weekly buckets beyond that. */
export function buildHoursSeries(entries: TimeEntry[], range: DateRange, settings: Pick<Settings, "timeZone" | "weekStartsOn">): HoursPoint[] {
  const tz = settings.timeZone;
  const days = daysInRange(range, tz);
  const weekly = days.length > 45;
  const bucketOf = (d: Date) => (weekly ? format(startOfWeek(new TZDate(d, tz), { weekStartsOn: settings.weekStartsOn }), "yyyy-MM-dd") : dayKey(d, tz));

  const points = new Map<string, HoursPoint>();
  for (const d of days) {
    const key = bucketOf(d);
    if (points.has(key)) continue;
    const start = weekly ? startOfWeek(d, { weekStartsOn: settings.weekStartsOn }) : d;
    points.set(key, {
      key,
      label: weekly ? format(start, "MMM d") : days.length <= 7 ? format(d, "EEE") : format(d, "d"),
      fullLabel: weekly ? `Week of ${format(start, "MMM d, yyyy")}` : format(d, "EEEE, MMM d"),
      billable: 0,
      nonBillable: 0,
    });
  }
  for (const e of entries) {
    if (!entryInRange(e, range)) continue;
    const p = points.get(bucketOf(new Date(e.startedAt)));
    if (!p) continue;
    const s = entryDurationSeconds(e);
    if (e.billable) p.billable += s;
    else p.nonBillable += s;
  }
  return [...points.values()];
}

export type BillableFilter = "all" | "billable" | "non-billable";

export interface ReportFilters {
  range: DateRange;
  clientId: string; // "" = all, "__internal" = no client
  projectId: string; // "" = all
  billable: BillableFilter;
}

export function filterEntries(entries: TimeEntry[], projects: Map<string, Project>, f: ReportFilters): TimeEntry[] {
  return entries.filter((e) => {
    if (!entryInRange(e, f.range)) return false;
    if (f.billable === "billable" && !e.billable) return false;
    if (f.billable === "non-billable" && e.billable) return false;
    if (f.projectId && e.projectId !== f.projectId) return false;
    if (f.clientId) {
      const p = projects.get(e.projectId);
      if (!p) return false;
      if (f.clientId === "__internal" ? p.clientId !== null : p.clientId !== f.clientId) return false;
    }
    return true;
  });
}

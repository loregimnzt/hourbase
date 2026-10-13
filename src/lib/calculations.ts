import type { Client, Currency, Project, Settings, TimeEntry } from "@/types";
import { entryDurationSeconds } from "./time";

/**
 * Revenue model (see README → "How revenue is calculated").
 *
 * Hourly projects
 *   earned revenue      = billable hours × billing rate
 *   (rate = project rate, or the user's default rate when the project has none)
 *   Non-billable hours earn nothing but still count as worked hours.
 *
 * Fixed-price projects
 *   agreed fee          = the contract value
 *   effective rate      = agreed fee / ALL tracked project hours (billable or not)
 *   period revenue      = hours tracked in the period × effective rate
 *   The fee is spread evenly over every tracked hour, so summing all periods
 *   gives back exactly the agreed fee. The per-period share shifts as more
 *   hours are logged — that is the point: extra hours dilute the rate.
 *
 * "Recorded revenue" = hourly earned revenue + fixed-fee allocation.
 * It is NOT profit (no expenses are tracked) and NOT payments received.
 */

export type Money = Partial<Record<Currency, number>>;

export function addMoney(target: Money, currency: Currency, amount: number): Money {
  target[currency] = (target[currency] ?? 0) + amount;
  return target;
}

export function hourlyRateFor(project: Project, settings: Pick<Settings, "defaultHourlyRate">): number {
  if (project.budgetType !== "hourly") return 0;
  return project.hourlyRate ?? settings.defaultHourlyRate ?? 0;
}

/** Earned revenue for an hourly project from billable seconds. */
export function hourlyEarnedRevenue(billableSeconds: number, rate: number): number {
  return (billableSeconds / 3600) * rate;
}

/** Effective revenue per tracked hour of a fixed-price project; null with no time tracked. */
export function fixedEffectiveRate(fee: number, trackedSeconds: number): number | null {
  if (trackedSeconds <= 0) return null;
  return fee / (trackedSeconds / 3600);
}

export interface ProjectStats {
  projectId: string;
  currency: Currency;
  totalSeconds: number;
  billableSeconds: number;
  nonBillableSeconds: number;
  entryCount: number;
  estimatedSeconds: number | null;
  /** tracked / estimated (0..n), null without an estimate. */
  estimateUsage: number | null;
  /** Billing rate used for hourly projects. */
  rate: number;
  /** Fixed: agreed fee. Hourly: null. */
  agreedFee: number | null;
  /** Fixed: agreed fee. Hourly: estimated hours × rate. Null if unknown. */
  estimatedRevenue: number | null;
  /** Hourly: billable × rate. Fixed: fee once any time is tracked. */
  recordedRevenue: number;
  /** recordedRevenue / all tracked hours. Null with no tracked time. */
  effectiveRate: number | null;
  lastTrackedAt: string | null;
}

/** Lifetime stats for one project. `entries` may include other projects' entries. */
export function computeProjectStats(project: Project, entries: TimeEntry[], settings: Pick<Settings, "defaultHourlyRate">): ProjectStats {
  let total = 0;
  let billable = 0;
  let count = 0;
  let last: string | null = null;
  for (const e of entries) {
    if (e.projectId !== project.id) continue;
    const d = entryDurationSeconds(e);
    total += d;
    if (e.billable) billable += d;
    count++;
    if (!last || e.startedAt > last) last = e.startedAt;
  }
  const rate = hourlyRateFor(project, settings);
  const estimatedSeconds = project.estimatedHours != null ? project.estimatedHours * 3600 : null;
  const isFixed = project.budgetType === "fixed";
  const fee = isFixed ? project.fixedFee ?? 0 : null;
  const recordedRevenue = isFixed ? (total > 0 ? fee ?? 0 : 0) : hourlyEarnedRevenue(billable, rate);
  return {
    projectId: project.id,
    currency: project.currency,
    totalSeconds: total,
    billableSeconds: billable,
    nonBillableSeconds: total - billable,
    entryCount: count,
    estimatedSeconds,
    estimateUsage: estimatedSeconds ? total / estimatedSeconds : null,
    rate,
    agreedFee: fee,
    estimatedRevenue: isFixed ? fee : project.estimatedHours != null ? project.estimatedHours * rate : null,
    recordedRevenue,
    effectiveRate: total > 0 ? recordedRevenue / (total / 3600) : null,
    lastTrackedAt: last,
  };
}

/** Lifetime tracked seconds per project — needed to allocate fixed fees. */
export function lifetimeSecondsByProject(entries: TimeEntry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.projectId, (map.get(e.projectId) ?? 0) + entryDurationSeconds(e));
  return map;
}

export interface RevenueContext {
  projects: Map<string, Project>;
  lifetimeSeconds: Map<string, number>;
  settings: Pick<Settings, "defaultHourlyRate">;
}

export function buildRevenueContext(projects: Project[], allEntries: TimeEntry[], settings: Pick<Settings, "defaultHourlyRate">): RevenueContext {
  return {
    projects: new Map(projects.map((p) => [p.id, p])),
    lifetimeSeconds: lifetimeSecondsByProject(allEntries),
    settings,
  };
}

/** Revenue attributed to a single entry under the model above. */
export function entryRevenue(entry: TimeEntry, ctx: RevenueContext): number {
  const project = ctx.projects.get(entry.projectId);
  if (!project) return 0;
  const seconds = entryDurationSeconds(entry);
  if (project.budgetType === "hourly") {
    return entry.billable ? hourlyEarnedRevenue(seconds, hourlyRateFor(project, ctx.settings)) : 0;
  }
  const lifetime = ctx.lifetimeSeconds.get(project.id) ?? 0;
  const rate = fixedEffectiveRate(project.fixedFee ?? 0, lifetime);
  return rate == null ? 0 : (seconds / 3600) * rate;
}

export interface PeriodSummary {
  totalSeconds: number;
  billableSeconds: number;
  nonBillableSeconds: number;
  entryCount: number;
  revenue: Money;
  /** Tracked seconds on projects of each currency (denominator for effective rate). */
  secondsByCurrency: Money;
}

export function summarizeEntries(entries: TimeEntry[], ctx: RevenueContext): PeriodSummary {
  const s: PeriodSummary = { totalSeconds: 0, billableSeconds: 0, nonBillableSeconds: 0, entryCount: 0, revenue: {}, secondsByCurrency: {} };
  for (const e of entries) {
    const d = entryDurationSeconds(e);
    s.totalSeconds += d;
    if (e.billable) s.billableSeconds += d;
    else s.nonBillableSeconds += d;
    s.entryCount++;
    const project = ctx.projects.get(e.projectId);
    if (project) {
      addMoney(s.revenue, project.currency, entryRevenue(e, ctx));
      addMoney(s.secondsByCurrency, project.currency, d);
    }
  }
  return s;
}

/** Average revenue per tracked hour, per currency. */
export function effectiveRateByCurrency(summary: PeriodSummary): Money {
  const out: Money = {};
  for (const [cur, seconds] of Object.entries(summary.secondsByCurrency) as [Currency, number][]) {
    if (seconds > 0) out[cur] = (summary.revenue[cur] ?? 0) / (seconds / 3600);
  }
  return out;
}

export interface GroupTotal {
  key: string;
  label: string;
  color?: string;
  seconds: number;
  billableSeconds: number;
  revenue: Money;
}

export function groupByProject(entries: TimeEntry[], ctx: RevenueContext): GroupTotal[] {
  const map = new Map<string, GroupTotal>();
  for (const e of entries) {
    const p = ctx.projects.get(e.projectId);
    if (!p) continue;
    const g = map.get(p.id) ?? { key: p.id, label: p.name, color: p.color, seconds: 0, billableSeconds: 0, revenue: {} };
    const d = entryDurationSeconds(e);
    g.seconds += d;
    if (e.billable) g.billableSeconds += d;
    addMoney(g.revenue, p.currency, entryRevenue(e, ctx));
    map.set(p.id, g);
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds);
}

export function groupByClient(entries: TimeEntry[], ctx: RevenueContext, clients: Client[]): GroupTotal[] {
  const names = new Map(clients.map((c) => [c.id, c.name]));
  const map = new Map<string, GroupTotal>();
  for (const e of entries) {
    const p = ctx.projects.get(e.projectId);
    if (!p) continue;
    const key = p.clientId ?? "__internal";
    const g = map.get(key) ?? { key, label: p.clientId ? names.get(p.clientId) ?? "Unknown client" : "Internal", seconds: 0, billableSeconds: 0, revenue: {} };
    const d = entryDurationSeconds(e);
    g.seconds += d;
    if (e.billable) g.billableSeconds += d;
    addMoney(g.revenue, p.currency, entryRevenue(e, ctx));
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.seconds - a.seconds);
}

/** Pick the amount in the preferred currency, plus the rest. */
export function splitMoney(money: Money, preferred: Currency): { primary: number; others: [Currency, number][] } {
  const others = (Object.entries(money) as [Currency, number][]).filter(([c, v]) => c !== preferred && Math.abs(v) > 0.004);
  return { primary: money[preferred] ?? 0, others };
}

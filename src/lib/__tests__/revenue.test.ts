import { describe, expect, it } from "vitest";
import type { Project, TimeEntry } from "@/types";
import {
  buildRevenueContext,
  computeProjectStats,
  effectiveRateByCurrency,
  entryRevenue,
  fixedEffectiveRate,
  hourlyEarnedRevenue,
  summarizeEntries,
} from "@/lib/calculations";

const base = { description: null, color: "#8B79C6", status: "active", startDate: null, deadline: null, estimatedHours: null, currency: "USD", notes: null, isDemo: false, createdAt: "", updatedAt: "", clientId: null } as const;
const hourly = (over: Partial<Project> = {}): Project => ({ ...base, id: "h", name: "Hourly", budgetType: "hourly", fixedFee: null, hourlyRate: 100, ...over });
const fixed = (over: Partial<Project> = {}): Project => ({ ...base, id: "f", name: "Fixed", budgetType: "fixed", fixedFee: 3000, hourlyRate: null, ...over });

let n = 0;
const entry = (projectId: string, hours: number, billable = true, day = 1): TimeEntry => {
  const start = new Date(Date.UTC(2026, 9, day, 9));
  return {
    id: `e${++n}`, projectId, description: "", notes: null, billable, breakSeconds: 0, source: "manual", isDemo: false, createdAt: "", updatedAt: "",
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + hours * 3600_000).toISOString(),
  };
};

describe("hourly billable revenue", () => {
  it("earns only on billable hours", () => {
    expect(hourlyEarnedRevenue(2.5 * 3600, 80)).toBe(200);
    const p = hourly();
    const stats = computeProjectStats(p, [entry("h", 3), entry("h", 1, false)], { defaultHourlyRate: null });
    expect(stats.totalSeconds).toBe(4 * 3600);
    expect(stats.billableSeconds).toBe(3 * 3600);
    expect(stats.recordedRevenue).toBe(300);
    expect(stats.effectiveRate).toBe(75); // 300 / 4h — non-billable hours dilute
  });

  it("falls back to the default rate when the project has none", () => {
    const stats = computeProjectStats(hourly({ hourlyRate: null }), [entry("h", 2)], { defaultHourlyRate: 60 });
    expect(stats.rate).toBe(60);
    expect(stats.recordedRevenue).toBe(120);
  });

  it("reports estimated revenue separately from earned revenue", () => {
    const stats = computeProjectStats(hourly({ estimatedHours: 10 }), [entry("h", 2)], { defaultHourlyRate: null });
    expect(stats.estimatedRevenue).toBe(1000);
    expect(stats.recordedRevenue).toBe(200);
    expect(stats.estimateUsage).toBeCloseTo(0.2);
  });
});

describe("fixed-price effective hourly revenue", () => {
  it("divides the agreed fee by all tracked hours", () => {
    expect(fixedEffectiveRate(3000, 40 * 3600)).toBe(75);
    expect(fixedEffectiveRate(3000, 0)).toBeNull();
    const stats = computeProjectStats(fixed(), [entry("f", 20), entry("f", 10, false)], { defaultHourlyRate: 999 });
    expect(stats.agreedFee).toBe(3000);
    expect(stats.recordedRevenue).toBe(3000);
    expect(stats.effectiveRate).toBe(100); // 3000 / 30h, billable flag irrelevant
  });

  it("has no recorded revenue or rate before any time is tracked", () => {
    const stats = computeProjectStats(fixed(), [], { defaultHourlyRate: null });
    expect(stats.recordedRevenue).toBe(0);
    expect(stats.effectiveRate).toBeNull();
    expect(stats.estimatedRevenue).toBe(3000);
  });

  it("allocates the fee across periods without double counting", () => {
    const all = [entry("f", 10, true, 1), entry("f", 20, true, 15)];
    const ctx = buildRevenueContext([fixed()], all, { defaultHourlyRate: null });
    const first = entryRevenue(all[0], ctx);
    const second = entryRevenue(all[1], ctx);
    expect(first).toBe(1000);
    expect(second).toBe(2000);
    expect(first + second).toBe(3000); // sums back to exactly the agreed fee
  });
});

describe("period summaries", () => {
  it("keeps currencies separate and computes effective rate per currency", () => {
    const projects = [hourly(), fixed({ id: "eur", currency: "EUR", fixedFee: 1000 })];
    const entries = [entry("h", 2), entry("h", 2, false), entry("eur", 5)];
    const ctx = buildRevenueContext(projects, entries, { defaultHourlyRate: null });
    const s = summarizeEntries(entries, ctx);
    expect(s.totalSeconds).toBe(9 * 3600);
    expect(s.billableSeconds).toBe(7 * 3600);
    expect(s.revenue).toEqual({ USD: 200, EUR: 1000 });
    expect(effectiveRateByCurrency(s)).toEqual({ USD: 50, EUR: 200 });
  });
});

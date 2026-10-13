"use client";
import { useMemo } from "react";
import { useData } from "@/components/providers/data-provider";
import { type Money, addMoney } from "@/lib/calculations";
import { useProjectStats } from "@/hooks/use-metrics";

export interface ClientStats {
  projectCount: number;
  activeProjects: number;
  totalSeconds: number;
  billableSeconds: number;
  revenue: Money;
  lastTrackedAt: string | null;
}

/** Per-client totals, aggregated from project lifetime stats. */
export function useClientStats(): Map<string, ClientStats> {
  const { data } = useData();
  const projectStats = useProjectStats();
  return useMemo(() => {
    const map = new Map<string, ClientStats>();
    for (const c of data.clients) map.set(c.id, { projectCount: 0, activeProjects: 0, totalSeconds: 0, billableSeconds: 0, revenue: {}, lastTrackedAt: null });
    for (const p of data.projects) {
      if (!p.clientId) continue;
      const cs = map.get(p.clientId);
      const ps = projectStats.get(p.id);
      if (!cs || !ps) continue;
      cs.projectCount++;
      if (p.status === "active") cs.activeProjects++;
      cs.totalSeconds += ps.totalSeconds;
      cs.billableSeconds += ps.billableSeconds;
      addMoney(cs.revenue, p.currency, ps.recordedRevenue);
      if (ps.lastTrackedAt && (!cs.lastTrackedAt || ps.lastTrackedAt > cs.lastTrackedAt)) cs.lastTrackedAt = ps.lastTrackedAt;
    }
    return map;
  }, [data.clients, data.projects, projectStats]);
}

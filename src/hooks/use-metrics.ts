"use client";
import { useMemo } from "react";
import { useData } from "@/components/providers/data-provider";
import { type ProjectStats, buildRevenueContext, computeProjectStats } from "@/lib/calculations";

/** Revenue context (project lookup + lifetime hours) shared by all metrics. */
export function useRevenueContext() {
  const { data } = useData();
  return useMemo(() => buildRevenueContext(data.projects, data.entries, data.settings), [data.projects, data.entries, data.settings]);
}

/** Lifetime stats per project, recomputed whenever entries or projects change. */
export function useProjectStats(): Map<string, ProjectStats> {
  const { data } = useData();
  return useMemo(() => {
    const byProject = new Map<string, typeof data.entries>();
    for (const e of data.entries) byProject.set(e.projectId, [...(byProject.get(e.projectId) ?? []), e]);
    return new Map(data.projects.map((p) => [p.id, computeProjectStats(p, byProject.get(p.id) ?? [], data.settings)]));
  }, [data]);
}

export function useLookups() {
  const { data } = useData();
  return useMemo(
    () => ({
      project: new Map(data.projects.map((p) => [p.id, p])),
      client: new Map(data.clients.map((c) => [c.id, c])),
    }),
    [data.projects, data.clients],
  );
}

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/components/providers/data-provider";
import { ColorDot } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/tooltip";
import { useLookups } from "@/hooks/use-metrics";
import type { GroupTotal, ProjectStats } from "@/lib/calculations";
import { formatMoney, formatRate } from "@/lib/format";
import { formatDuration } from "@/lib/time";
import { cn } from "@/lib/utils";

type SortKey = "hours" | "revenue" | "rate" | "name";

export function ProfitabilityTable({ groups, projectStats }: { groups: GroupTotal[]; projectStats: Map<string, ProjectStats> }) {
  const { data } = useData();
  const lookups = useLookups();
  const [sort, setSort] = useState<SortKey>("hours");

  const rows = useMemo(() => {
    const list = groups.flatMap((g) => {
      const p = lookups.project.get(g.key);
      if (!p) return [];
      const revenue = g.revenue[p.currency] ?? 0;
      return [{ g, p, s: projectStats.get(p.id), revenue, periodRate: g.seconds ? revenue / (g.seconds / 3600) : null }];
    });
    return list.sort((a, b) => {
      if (sort === "name") return a.p.name.localeCompare(b.p.name);
      if (sort === "revenue") return b.revenue - a.revenue;
      if (sort === "rate") return (b.s?.effectiveRate ?? -1) - (a.s?.effectiveRate ?? -1);
      return b.g.seconds - a.g.seconds;
    });
  }, [groups, lookups, projectStats, sort]);

  const th = (key: SortKey, label: string, align: "left" | "right" = "right") => (
    <th scope="col" aria-sort={sort === key ? "descending" : "none"} className={cn("px-4 py-3 font-medium", align === "right" && "text-right")}>
      <button type="button" onClick={() => setSort(key)} className={cn("hover:text-fg", sort === key && "text-fg")}>
        {label}
        {sort === key && " ↓"}
      </button>
    </th>
  );

  return (
    <Card>
      <CardHeader title="Project profitability" description="Period figures follow the filters; lifetime figures cover all time on the project." />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-y border-line text-left text-xs text-subtle">
              {th("name", "Project", "left")}
              <th scope="col" className="px-4 py-3 font-medium">Budget</th>
              {th("hours", "Period hours")}
              <th scope="col" className="px-4 py-3 text-right font-medium">Billable</th>
              {th("revenue", "Period revenue")}
              <th scope="col" className="px-4 py-3 text-right font-medium">Period / h</th>
              {th("rate", "Lifetime eff. rate")}
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="inline-flex items-center gap-1">
                  Fee / est. revenue
                  <InfoTip label="About fee and estimated revenue">Fixed: the agreed fee. Hourly: estimated hours × rate. Shown for comparison only — never added to recorded revenue.</InfoTip>
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ g, p, s, revenue, periodRate }) => (
              <tr key={p.id} className="hover:bg-hover/40">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-2 font-medium hover:text-accent-text">
                    <ColorDot color={p.color} />
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{p.budgetType === "fixed" ? "Fixed" : `Hourly ${s?.rate ? formatRate(s.rate, p.currency) : ""}`}</td>
                <td className="tabular px-4 py-3 text-right">{formatDuration(g.seconds)}</td>
                <td className="tabular px-4 py-3 text-right text-muted">{formatDuration(g.billableSeconds)}</td>
                <td className="tabular px-4 py-3 text-right">{formatMoney(revenue, p.currency)}</td>
                <td className="tabular px-4 py-3 text-right text-muted">{formatRate(periodRate, p.currency)}</td>
                <td className="tabular px-4 py-3 text-right font-medium">{formatRate(s?.effectiveRate, p.currency)}</td>
                <td className="tabular px-4 py-3 text-right text-muted">{s?.estimatedRevenue != null ? formatMoney(s.estimatedRevenue, p.currency) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-4 text-xs text-subtle">Default currency: {data.settings.currency}. Amounts are shown in each project&apos;s own currency.</p>
    </Card>
  );
}

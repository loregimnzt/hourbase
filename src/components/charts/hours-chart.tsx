"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDuration } from "@/lib/time";
import { Legend, TooltipCard } from "./chart-tooltip";

import type { HoursPoint } from "@/lib/reports";
export type { HoursPoint };


export const BILLABLE_COLOR = "var(--accent)";
export const NON_BILLABLE_COLOR = "var(--line-strong)";

/** Stacked billable / non-billable hours per bucket (day or week). */
export function HoursChart({ data, height = 240, caption }: { data: HoursPoint[]; height?: number; caption: string }) {
  const rows = data.map((d) => ({ ...d, b: d.billable / 3600, n: d.nonBillable / 3600 }));
  const dense = data.length > 14;
  return (
    <figure className="flex flex-col gap-3">
      <div style={{ height }} className="-ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={dense ? "18%" : "28%"} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--subtle)", fontSize: 11 }} interval={dense ? "preserveStartEnd" : 0} minTickGap={8} />
            <YAxis tickLine={false} axisLine={false} width={36} tick={{ fill: "var(--subtle)", fontSize: 11 }} tickFormatter={(v: number) => `${v}h`} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "var(--hover)", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof rows)[number];
                return (
                  <TooltipCard
                    title={p.fullLabel}
                    rows={[
                      { label: "Billable", value: formatDuration(p.billable), color: BILLABLE_COLOR },
                      { label: "Non-billable", value: formatDuration(p.nonBillable), color: NON_BILLABLE_COLOR },
                      { label: "Total", value: formatDuration(p.billable + p.nonBillable) },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="n" stackId="h" fill={NON_BILLABLE_COLOR} stroke="var(--surface)" strokeWidth={1} name="Non-billable" maxBarSize={44} />
            <Bar dataKey="b" stackId="h" fill={BILLABLE_COLOR} stroke="var(--surface)" strokeWidth={1} radius={[4, 4, 0, 0]} name="Billable" maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend items={[{ label: "Billable", color: BILLABLE_COLOR }, { label: "Non-billable", color: NON_BILLABLE_COLOR }]} />
      <figcaption className="sr-only">{caption}</figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>Billable</th>
            <th>Non-billable</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <td>{d.fullLabel}</td>
              <td>{formatDuration(d.billable)}</td>
              <td>{formatDuration(d.nonBillable)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

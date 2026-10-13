"use client";
import { withData } from "@/components/layout/with-data";
import { ChartColumn, Download, FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";
import type { Currency } from "@/types";
import { BarList } from "@/components/charts/bar-list";
import { EstimateBullets } from "@/components/charts/estimate-bullets";
import { HoursChart } from "@/components/charts/hours-chart";
import { BillableSplit } from "@/components/charts/split-meter";
import { useData } from "@/components/providers/data-provider";
import { RevenueExplainer } from "@/components/reports/revenue-explainer";
import { ProfitabilityTable } from "@/components/reports/profitability-table";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { useLookups, useProjectStats, useRevenueContext } from "@/hooks/use-metrics";
import { effectiveRateByCurrency, entryRevenue, groupByClient, groupByProject, splitMoney, summarizeEntries } from "@/lib/calculations";
import { downloadCSV, toCSV } from "@/lib/csv";
import { formatMoney, formatMoneyMulti, formatPercent, formatRate } from "@/lib/format";
import { type BillableFilter, buildHoursSeries, filterEntries } from "@/lib/reports";
import { type RangePreset, entryDurationSeconds, formatDuration, formatInZone, getRange, todayISO } from "@/lib/time";

type ReportPreset = Extract<RangePreset, "today" | "week" | "month" | "lastMonth" | "custom">;

function ReportsPage() {
  const { data } = useData();
  const { settings } = data;
  const ctx = useRevenueContext();
  const projectStats = useProjectStats();
  const lookups = useLookups();
  const toast = useToast();

  const [preset, setPreset] = useState<ReportPreset>("month");
  const [customStart, setCustomStart] = useState(() => todayISO(settings.timeZone).slice(0, 8) + "01");
  const [customEnd, setCustomEnd] = useState(() => todayISO(settings.timeZone));
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [billable, setBillable] = useState<BillableFilter>("all");

  const range = useMemo(
    () => getRange(preset, { timeZone: settings.timeZone, weekStartsOn: settings.weekStartsOn, customStart, customEnd }),
    [preset, settings.timeZone, settings.weekStartsOn, customStart, customEnd],
  );

  const r = useMemo(() => {
    const entries = filterEntries(data.entries, ctx.projects, { range, clientId, projectId, billable });
    const summary = summarizeEntries(entries, ctx);
    return {
      entries,
      summary,
      rates: effectiveRateByCurrency(summary),
      byProject: groupByProject(entries, ctx),
      byClient: groupByClient(entries, ctx, data.clients),
      series: buildHoursSeries(entries, range, settings),
    };
  }, [data.entries, data.clients, ctx, range, clientId, projectId, billable, settings]);

  const projectOptions = data.projects
    .filter((p) => !clientId || (clientId === "__internal" ? !p.clientId : p.clientId === clientId))
    .sort((a, b) => a.name.localeCompare(b.name));
  const clientOptions = [...data.clients].sort((a, b) => a.name.localeCompare(b.name));

  const estimateRows = r.byProject
    .map((g) => {
      const p = lookups.project.get(g.key);
      const s = projectStats.get(g.key);
      if (!p || !s?.estimatedSeconds) return null;
      return { key: p.id, label: p.name, color: p.color, actualSeconds: s.totalSeconds, estimatedSeconds: s.estimatedSeconds, href: `/projects/${p.id}` };
    })
    .filter((x) => x !== null);

  const revenueRows = r.byProject
    .flatMap((g) => {
      const p = lookups.project.get(g.key);
      const amount = p ? g.revenue[p.currency] ?? 0 : 0;
      return p && amount > 0 ? [{ g, p, amount }] : [];
    })
    .sort((a, b) => b.amount - a.amount);

  const rate = splitMoney(r.rates, settings.currency);
  const revenue = splitMoney(r.summary.revenue, settings.currency);
  const billableShare = r.summary.totalSeconds ? r.summary.billableSeconds / r.summary.totalSeconds : null;
  const rangeText = `${formatInZone(range.start, settings.timeZone, "MMM d, yyyy")} – ${formatInZone(range.end, settings.timeZone, "MMM d, yyyy")}`;
  const fileStamp = `${formatInZone(range.start, settings.timeZone, "yyyy-MM-dd")}_to_${formatInZone(range.end, settings.timeZone, "yyyy-MM-dd")}`;

  const exportEntries = () => {
    const rows = [...r.entries]
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .map((e) => {
        const p = lookups.project.get(e.projectId);
        const c = p?.clientId ? lookups.client.get(p.clientId) : undefined;
        const secs = entryDurationSeconds(e);
        return [
          formatInZone(e.startedAt, settings.timeZone, "yyyy-MM-dd"),
          formatInZone(e.startedAt, settings.timeZone, "HH:mm"),
          formatInZone(e.endedAt, settings.timeZone, "HH:mm"),
          Math.round(e.breakSeconds / 60),
          (secs / 3600).toFixed(2),
          c?.name ?? "Internal",
          p?.name ?? "",
          e.description,
          e.billable ? "yes" : "no",
          p?.budgetType ?? "",
          p?.currency ?? "",
          entryRevenue(e, ctx).toFixed(2),
          e.notes ?? "",
          e.source,
        ];
      });
    downloadCSV(
      `hourbase-entries_${fileStamp}.csv`,
      toCSV(["Date", "Start", "End", "Break (min)", "Hours", "Client", "Project", "Description", "Billable", "Budget type", "Currency", "Recorded revenue", "Notes", "Source"], rows),
    );
    toast.success("Export ready", `${rows.length} entries · times in ${settings.timeZone}`);
  };

  const exportSummary = () => {
    const rows = r.byProject.map((g) => {
      const p = lookups.project.get(g.key);
      const s = projectStats.get(g.key);
      const c = p?.clientId ? lookups.client.get(p.clientId) : undefined;
      const cur = p?.currency as Currency;
      return [
        p?.name ?? "",
        c?.name ?? "Internal",
        p?.budgetType ?? "",
        cur,
        (g.seconds / 3600).toFixed(2),
        (g.billableSeconds / 3600).toFixed(2),
        (g.revenue[cur] ?? 0).toFixed(2),
        g.seconds ? ((g.revenue[cur] ?? 0) / (g.seconds / 3600)).toFixed(2) : "",
        p?.budgetType === "fixed" ? (p.fixedFee ?? 0).toFixed(2) : "",
        s?.estimatedRevenue != null ? s.estimatedRevenue.toFixed(2) : "",
        s ? (s.totalSeconds / 3600).toFixed(2) : "",
        s?.estimatedSeconds ? (s.estimatedSeconds / 3600).toFixed(2) : "",
        s?.effectiveRate != null ? s.effectiveRate.toFixed(2) : "",
      ];
    });
    downloadCSV(
      `hourbase-summary_${fileStamp}.csv`,
      toCSV(
        ["Project", "Client", "Budget type", "Currency", "Period hours", "Period billable hours", "Period recorded revenue", "Period revenue per hour", "Agreed fee", "Estimated revenue", "Lifetime hours", "Estimated hours", "Lifetime effective rate"],
        rows,
      ),
    );
    toast.success("Export ready", `${rows.length} projects`);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Where your time went and what it earned."
        actions={
          <>
            <Button variant="secondary" icon={<FileSpreadsheet className="size-4" aria-hidden />} onClick={exportSummary} disabled={!r.entries.length}>
              Export summary
            </Button>
            <Button icon={<Download className="size-4" aria-hidden />} onClick={exportEntries} disabled={!r.entries.length}>
              Export CSV
            </Button>
          </>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Report period"
              value={preset}
              onChange={setPreset}
              className="max-w-full overflow-x-auto"
              options={[
                { value: "today", label: "Today" },
                { value: "week", label: "This week" },
                { value: "month", label: "This month" },
                { value: "lastMonth", label: "Last month" },
                { value: "custom", label: "Custom" },
              ]}
            />
            <p className="tabular text-[13px] text-muted">{rangeText}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {preset === "custom" && (
              <>
                <Field label="From">{(a) => <Input {...a} type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} />}</Field>
                <Field label="To">{(a) => <Input {...a} type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} />}</Field>
              </>
            )}
            <Field label="Client">
              {(a) => (
                <Select
                  {...a}
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setProjectId("");
                  }}
                >
                  <option value="">All clients</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.archived ? " (archived)" : ""}
                    </option>
                  ))}
                  <option value="__internal">Internal</option>
                </Select>
              )}
            </Field>
            <Field label="Project">
              {(a) => (
                <Select {...a} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">All projects</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Billable status">
              {(a) => (
                <Select {...a} value={billable} onChange={(e) => setBillable(e.target.value as BillableFilter)}>
                  <option value="all">Billable & non-billable</option>
                  <option value="billable">Billable only</option>
                  <option value="non-billable">Non-billable only</option>
                </Select>
              )}
            </Field>
          </div>
        </div>
      </Card>

      <section aria-label="Report summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Hours tracked" value={formatDuration(r.summary.totalSeconds)} sub={`${r.summary.entryCount} entries`} />
        <StatCard label="Billable" value={formatPercent(billableShare)} sub={`${formatDuration(r.summary.billableSeconds)} billable`} />
        <StatCard
          label="Recorded revenue"
          value={formatMoney(revenue.primary, settings.currency)}
          sub={revenue.others.length ? `+ ${revenue.others.map(([c, v]) => formatMoney(v, c)).join(" + ")}` : "Accrued, not payments received"}
          info="Hourly: billable hours × rate. Fixed-price: this period's share of the agreed fee (fee ÷ all project hours × hours in this period). Not net profit — expenses aren't tracked."
        />
        <StatCard
          label="Revenue per hour"
          value={(r.summary.secondsByCurrency[settings.currency] ?? 0) > 0 ? formatRate(rate.primary, settings.currency) : "—"}
          sub={rate.others.length ? rate.others.map(([c, v]) => formatRate(v, c)).join(" · ") : `${settings.currency} projects`}
          info="Recorded revenue ÷ all tracked hours in the selection, per currency. Currencies are never converted or mixed."
        />
      </section>

      {!r.entries.length ? (
        <Card>
          <EmptyState icon={<ChartColumn className="size-5" aria-hidden />} title="No time tracked for this selection" description="Pick a different period or clear the client, project and billable filters." />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Hours over time" description={r.series.length > 45 ? "Weekly totals" : "Daily totals"} />
            <div className="px-5 pt-4 pb-5">
              <HoursChart data={r.series} caption={`Hours tracked, ${rangeText}`} height={260} />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Hours by project" />
              <div className="px-5 pt-4 pb-5">
                <BarList
                  items={r.byProject.map((g) => ({
                    key: g.key,
                    label: g.label,
                    color: g.color,
                    value: g.seconds,
                    display: formatDuration(g.seconds),
                    sub: formatPercent(g.seconds / r.summary.totalSeconds),
                    href: `/projects/${g.key}`,
                  }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Hours by client" />
              <div className="px-5 pt-4 pb-5">
                <BarList
                  items={r.byClient.map((g) => ({
                    key: g.key,
                    label: g.label,
                    value: g.seconds,
                    display: formatDuration(g.seconds),
                    sub: formatPercent(g.seconds / r.summary.totalSeconds),
                    href: g.key === "__internal" ? undefined : `/clients/${g.key}`,
                  }))}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Billable vs non-billable" />
              <div className="px-5 pt-4 pb-5">
                <BillableSplit billable={r.summary.billableSeconds} nonBillable={r.summary.nonBillableSeconds} />
              </div>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Estimated vs actual hours" description="Lifetime hours for projects in this selection. Marker = estimate." />
              <div className="px-5 pt-4 pb-5">
                <EstimateBullets rows={estimateRows} />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Revenue by project" description="Recorded revenue in this period, in each project's currency." />
            <div className="px-5 pt-4 pb-5">
              <BarList
                emptyLabel="No revenue recorded in this selection (non-billable or unpriced time only)."
                items={revenueRows.map(({ g, p, amount }) => ({
                  key: g.key,
                  label: g.label,
                  color: g.color,
                  // Bars are only comparable within one currency; others are scaled but labeled.
                  value: amount,
                  display: formatMoney(amount, p.currency),
                  sub: p.currency !== settings.currency ? p.currency : undefined,
                  href: `/projects/${g.key}`,
                }))}
              />
              {revenueRows.some(({ p }) => p.currency !== settings.currency) && (
                <p className="mt-4 text-xs text-subtle">Bars compare raw amounts; projects in other currencies are labeled and not converted.</p>
              )}
            </div>
          </Card>

          <ProfitabilityTable groups={r.byProject} projectStats={projectStats} />
        </>
      )}

      <RevenueExplainer totalLabel={formatMoneyMulti(r.summary.revenue, settings.currency)} />
    </div>
  );
}

export default withData(ReportsPage);

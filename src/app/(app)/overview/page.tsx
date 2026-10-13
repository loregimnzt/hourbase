"use client";
import { withData } from "@/components/layout/with-data";
import Link from "next/link";
import { CalendarClock, Clock, FolderKanban, FolderPlus, Gauge, Play, Plus, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { BarList } from "@/components/charts/bar-list";
import { HoursChart } from "@/components/charts/hours-chart";
import { EntryList } from "@/components/entries/entry-list";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { StatCard } from "@/components/shared/stat-card";
import { ActiveTimerCard } from "@/components/tracker/active-timer-card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { useNow } from "@/hooks/use-now";
import { useRevenueContext } from "@/hooks/use-metrics";
import { effectiveRateByCurrency, groupByProject, splitMoney, summarizeEntries } from "@/lib/calculations";
import { formatMoney, formatRate } from "@/lib/format";
import { buildHoursSeries } from "@/lib/reports";
import { type RangePreset, entryInRange, formatDuration, formatInZone, getRange, greetingFor } from "@/lib/time";

type OverviewRange = Extract<RangePreset, "week" | "last7" | "month" | "last30">;

function OverviewPage() {
  const { data } = useData();
  const { openNewEntry, openProject } = useAppActions();
  const ctx = useRevenueContext();
  const { settings, entries, projects } = data;
  const [preset, setPreset] = useState<OverviewRange>("week");
  // Refresh "today"/"this week" boundaries every minute.
  const now = useNow(60_000);

  const m = useMemo(() => {
    const opts = { timeZone: settings.timeZone, weekStartsOn: settings.weekStartsOn, now };
    const today = getRange("today", opts);
    const week = getRange("week", opts);
    const range = getRange(preset, opts);
    const inRange = entries.filter((e) => entryInRange(e, range));
    const summary = summarizeEntries(inRange, ctx);
    return {
      range,
      inRange,
      todaySeconds: summarizeEntries(entries.filter((e) => entryInRange(e, today)), ctx).totalSeconds,
      weekSeconds: summarizeEntries(entries.filter((e) => entryInRange(e, week)), ctx).totalSeconds,
      summary,
      rates: effectiveRateByCurrency(summary),
      byProject: groupByProject(inRange, ctx),
      series: buildHoursSeries(entries, range, settings),
      hasExamples: inRange.some((e) => e.isDemo),
    };
  }, [entries, ctx, settings, preset, now]);

  const activeProjects = projects.filter((p) => p.status === "active");
  const rate = splitMoney(m.rates, settings.currency);
  const otherRates = rate.others.map(([c, v]) => formatRate(v, c)).join(" · ");
  const revenue = splitMoney(m.summary.revenue, settings.currency);
  const hasPrimaryCurrencyTime = (m.summary.secondsByCurrency[settings.currency] ?? 0) > 0;

  const isFirstRun = projects.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{formatInZone(now, settings.timeZone, "EEEE, MMMM d")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {greetingFor(settings.timeZone, now)}
            {settings.displayName ? `, ${settings.displayName}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!data.activeTimer && (
            <ButtonLink href="/tracker" icon={<Play className="size-4 fill-current" aria-hidden />}>
              Start timer
            </ButtonLink>
          )}
          <button type="button" className={buttonClasses("secondary")} onClick={() => openNewEntry()}>
            <Plus className="size-4" aria-hidden />
            Manual entry
          </button>
          <button type="button" className={buttonClasses("secondary")} onClick={() => openProject()}>
            <FolderPlus className="size-4" aria-hidden />
            New project
          </button>
        </div>
      </header>

      {isFirstRun ? (
        <Card>
          <EmptyState
            icon={<FolderKanban className="size-5" aria-hidden />}
            title="Create your first project to start tracking"
            description="Projects hold your rate or fixed fee, so every hour you track turns into clear profitability numbers."
            action={
              <>
                <button type="button" className={buttonClasses("primary")} onClick={() => openProject()}>
                  <FolderPlus className="size-4" aria-hidden /> New project
                </button>
                <ButtonLink href="/clients" variant="secondary">
                  Add a client first
                </ButtonLink>
              </>
            }
          />
        </Card>
      ) : (
        <>
          {data.activeTimer && <ActiveTimerCard compact />}

          <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Today" icon={<Clock className="size-4" aria-hidden />} value={formatDuration(m.todaySeconds)} sub={data.activeTimer ? "Excludes the running timer" : "Tracked so far"} />
            <StatCard label="This week" icon={<CalendarClock className="size-4" aria-hidden />} value={formatDuration(m.weekSeconds)} sub={`Week starts ${["Sunday", "Monday", "", "", "", "", "Saturday"][settings.weekStartsOn]}`} />
            <StatCard label="Active projects" icon={<FolderKanban className="size-4" aria-hidden />} value={activeProjects.length} sub={`${projects.length - activeProjects.length} completed or archived`} />
            <StatCard
              label="Avg. revenue / hour"
              icon={<Gauge className="size-4" aria-hidden />}
              value={hasPrimaryCurrencyTime ? formatRate(rate.primary, settings.currency) : "—"}
              sub={otherRates ? `Also ${otherRates}` : m.range.label}
              info={
                <>
                  Recorded revenue ÷ all tracked hours in {m.range.label.toLowerCase()}, for {settings.currency} projects. Hourly projects earn on billable time; fixed fees are spread over every hour tracked on the project. Not profit — expenses aren&apos;t tracked.
                </>
              }
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Working hours"
                description={
                  <>
                    {formatDuration(m.summary.totalSeconds)} tracked · {formatMoney(revenue.primary, settings.currency)} recorded revenue
                    {revenue.others.map(([c, v]) => ` + ${formatMoney(v, c)}`).join("")}
                  </>
                }
                action={
                  <Segmented
                    label="Date range"
                    size="sm"
                    value={preset}
                    onChange={setPreset}
                    options={[
                      { value: "week", label: "Week" },
                      { value: "last7", label: "7 days" },
                      { value: "month", label: "Month" },
                      { value: "last30", label: "30 days" },
                    ]}
                  />
                }
              />
              <div className="px-5 pt-4 pb-5">
                <HoursChart data={m.series} caption={`Hours tracked per day, ${m.range.label}`} />
              </div>
            </Card>

            <Card>
              <CardHeader title="Time by project" description={m.range.label} action={m.hasExamples ? <Badge>Example data</Badge> : undefined} />
              <div className="px-5 pt-4 pb-5">
                <BarList
                  emptyLabel="No time tracked in this period yet."
                  items={m.byProject.slice(0, 6).map((g) => ({
                    key: g.key,
                    label: g.label,
                    color: g.color,
                    value: g.seconds,
                    display: formatDuration(g.seconds),
                    sub: m.summary.totalSeconds ? `${Math.round((g.seconds / m.summary.totalSeconds) * 100)}%` : undefined,
                    href: `/projects/${g.key}`,
                  }))}
                />
                {m.byProject.length > 6 && (
                  <Link href="/reports" className="mt-4 inline-block text-[13px] font-medium text-accent-text hover:underline">
                    See all {m.byProject.length} projects in Reports
                  </Link>
                )}
              </div>
            </Card>
          </div>

          <section aria-labelledby="recent-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="recent-heading" className="text-[15px] font-semibold">
                Recent time entries
              </h2>
              <Link href="/tracker" className="text-[13px] font-medium text-accent-text hover:underline">
                View all
              </Link>
            </div>
            {entries.length ? (
              <EntryList entries={entries} limit={6} allowContinue />
            ) : (
              <Card>
                <EmptyState
                  icon={<Timer className="size-5" aria-hidden />}
                  title="No time tracked yet"
                  description="Start the timer when you begin working, or add time you already worked."
                  action={
                    <>
                      <ButtonLink href="/tracker">Start timer</ButtonLink>
                      <button type="button" className={buttonClasses("secondary")} onClick={() => openNewEntry()}>
                        Add manual entry
                      </button>
                    </>
                  }
                />
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default withData(OverviewPage);

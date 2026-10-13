"use client";
import { withData } from "@/components/layout/with-data";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CircleCheck, Pencil, Play, Plus, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { HoursChart } from "@/components/charts/hours-chart";
import { EntryList } from "@/components/entries/entry-list";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { STATUS_LABEL, STATUS_TONE } from "@/components/projects/status";
import { useProjectActions } from "@/components/projects/use-project-actions";
import { StatCard } from "@/components/shared/stat-card";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Menu } from "@/components/ui/menu";
import { EmptyState, Progress } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { useProjectStats } from "@/hooks/use-metrics";
import { formatMoney, formatPercent, formatRate } from "@/lib/format";
import { buildHoursSeries } from "@/lib/reports";
import { dayKey, formatCalendarDate, formatDuration, formatHours, getRange } from "@/lib/time";
import { useNow } from "@/hooks/use-now";
import { errorMessage } from "@/lib/utils";

function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, startTimer } = useData();
  const { openProject, openNewEntry } = useAppActions();
  const { menuItems, setStatus } = useProjectActions();
  const statsMap = useProjectStats();
  const toast = useToast();
  const [limit, setLimit] = useState(10);

  const project = data.projects.find((p) => p.id === id);
  const s = project ? statsMap.get(project.id) : undefined;
  const client = project?.clientId ? data.clients.find((c) => c.id === project.clientId) : undefined;
  const entries = useMemo(() => data.entries.filter((e) => e.projectId === id), [data.entries, id]);
  const now = useNow(60_000);
  const series = useMemo(() => {
    const tz = data.settings.timeZone;
    const range = getRange("custom", {
      timeZone: tz,
      weekStartsOn: data.settings.weekStartsOn,
      customStart: dayKey(new Date(now.getTime() - 83 * 86400_000), tz),
      customEnd: dayKey(now, tz),
    });
    return buildHoursSeries(entries, range, data.settings);
  }, [entries, data.settings, now]);

  if (!project || !s) {
    return (
      <Card>
        <EmptyState title="Project not found" description="It may have been deleted, or the link is wrong." action={<ButtonLink href="/projects">Back to projects</ButtonLink>} />
      </Card>
    );
  }

  const cur = project.currency;
  const fixed = project.budgetType === "fixed";
  const targetRate = fixed ? (project.fixedFee && project.estimatedHours ? project.fixedFee / project.estimatedHours : null) : s.rate || null;
  const timerElsewhere = Boolean(data.activeTimer);
  const usage = s.estimateUsage;

  const onStart = async () => {
    try {
      await startTimer({ projectId: project.id, description: "", notes: null, billable: true });
      toast.success("Timer started", project.name);
    } catch (e) {
      if (!(e instanceof Error && e.name.startsWith("Timer"))) toast.error("Couldn't start timer", errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/projects" className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Projects
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <ColorDot color={project.color} className="size-3.5" />
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{project.name}</h1>
            <Badge tone={STATUS_TONE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
            {project.isDemo && <Badge>Example</Badge>}
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {client ? (
              <Link href={`/clients/${client.id}`} className="hover:text-accent-text">
                {client.name}
              </Link>
            ) : (
              "Internal project"
            )}
            {project.description && <> · {project.description}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.status === "active" && (
            <Button onClick={onStart} disabled={timerElsewhere} title={timerElsewhere ? "Stop the running timer first" : undefined} icon={<Play className="size-4 fill-current" aria-hidden />}>
              Start timer
            </Button>
          )}
          <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => openNewEntry({ projectId: project.id })} disabled={project.status !== "active"} title={project.status !== "active" ? "Reactivate the project to add time" : undefined}>
            Add entry
          </Button>
          <Button variant="secondary" icon={<Pencil className="size-4" aria-hidden />} onClick={() => openProject(project)}>
            Edit
          </Button>
          {project.status === "active" && (
            <Button variant="ghost" icon={<CircleCheck className="size-4" aria-hidden />} onClick={() => setStatus(project, "completed")}>
              Complete
            </Button>
          )}
          <Menu label="More project actions" items={menuItems(project, { redirect: true })} />
        </div>
      </header>

      {project.status !== "active" && (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-muted">
          This project is {project.status}. Its history stays in reports; reactivate it to track new time.
        </p>
      )}

      <section aria-label="Project metrics" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Tracked" value={formatDuration(s.totalSeconds)} sub={`${formatDuration(s.billableSeconds)} billable · ${formatDuration(s.nonBillableSeconds)} non-billable`} />
        <StatCard
          label="Estimate used"
          value={usage != null ? formatPercent(usage) : "—"}
          sub={s.estimatedSeconds ? `${formatHours(s.totalSeconds)}h of ${formatHours(s.estimatedSeconds)}h` : "No hour estimate set"}
        />
        <StatCard
          label={fixed ? "Agreed fee" : "Earned revenue"}
          value={formatMoney(fixed ? s.agreedFee ?? 0 : s.recordedRevenue, cur)}
          sub={fixed ? "Fixed price — doesn't grow with hours" : `${formatHours(s.billableSeconds)} billable h × ${formatRate(s.rate, cur)}`}
          info={fixed ? "The contract value. Payments received aren't tracked in Hourbase yet." : "Billable hours × hourly rate. Non-billable time earns nothing. This is accrued revenue, not payments received or profit."}
        />
        <StatCard
          label="Effective rate"
          value={formatRate(s.effectiveRate, cur)}
          sub={targetRate ? `${fixed ? "Target" : "Billing rate"} ${formatRate(targetRate, cur)}` : "Revenue ÷ all tracked hours"}
          info={
            fixed
              ? "Agreed fee ÷ every hour tracked on this project (billable or not). Every extra hour lowers it."
              : "Earned revenue ÷ all tracked hours. Lower than the billing rate when you log non-billable time."
          }
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Weekly hours" description="Last 12 weeks" />
          <div className="px-5 pt-4 pb-5">
            <HoursChart data={series} caption={`Weekly hours on ${project.name}, last 12 weeks`} height={220} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Budget & profitability" />
          <div className="flex flex-col gap-4 px-5 pt-4 pb-5 text-sm">
            {usage != null && (
              <div>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span className="text-muted">Hours vs estimate</span>
                  <span className="tabular font-medium">{formatPercent(usage)}</span>
                </div>
                <Progress value={usage} tone={usage > 1 ? "danger" : usage > 0.85 ? "warning" : "accent"} label="Estimate consumption" />
                {usage > 1 && (
                  <p className="mt-2 flex items-start gap-1.5 text-[13px] text-warning">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {formatHours(s.totalSeconds - (s.estimatedSeconds ?? 0))}h over the estimate.
                  </p>
                )}
              </div>
            )}
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5">
              <dt className="text-muted">Budget type</dt>
              <dd className="text-right">{fixed ? "Fixed price" : "Hourly"}</dd>
              {fixed ? (
                <>
                  <dt className="text-muted">Agreed fee</dt>
                  <dd className="tabular text-right">{formatMoney(project.fixedFee ?? 0, cur)}</dd>
                  <dt className="text-muted">Target rate</dt>
                  <dd className="tabular text-right">{formatRate(targetRate, cur)}</dd>
                </>
              ) : (
                <>
                  <dt className="text-muted">Billing rate</dt>
                  <dd className="tabular text-right">
                    {formatRate(s.rate, cur)}
                    {project.hourlyRate == null && s.rate > 0 && <span className="ml-1 text-xs text-subtle">(default)</span>}
                  </dd>
                  <dt className="text-muted">Estimated revenue</dt>
                  <dd className="tabular text-right">{s.estimatedRevenue != null ? formatMoney(s.estimatedRevenue, cur) : "—"}</dd>
                  <dt className="text-muted">Earned so far</dt>
                  <dd className="tabular text-right">{formatMoney(s.recordedRevenue, cur)}</dd>
                </>
              )}
              <dt className="text-muted">Effective rate</dt>
              <dd className="tabular text-right font-medium">{formatRate(s.effectiveRate, cur)}</dd>
              <dt className="text-muted">Start date</dt>
              <dd className="text-right">{project.startDate ? formatCalendarDate(project.startDate, data.settings.dateFormat) : "—"}</dd>
              <dt className="text-muted">Deadline</dt>
              <dd className="text-right">{project.deadline ? formatCalendarDate(project.deadline, data.settings.dateFormat) : "—"}</dd>
            </dl>
            {!fixed && s.rate === 0 && (
              <p className="rounded-xl bg-warning-soft px-3 py-2 text-[13px] text-warning">No billing rate set, so this project records no revenue. Add a rate here or a default rate in Settings.</p>
            )}
            {project.notes && <p className="border-t border-line pt-3 text-[13px] whitespace-pre-line text-muted">{project.notes}</p>}
          </div>
        </Card>
      </div>

      <section aria-labelledby="sessions-heading" className="flex flex-col gap-3">
        <h2 id="sessions-heading" className="text-[15px] font-semibold">
          Recent sessions <span className="tabular font-normal text-subtle">({entries.length})</span>
        </h2>
        {entries.length ? (
          <>
            <EntryList entries={entries} limit={limit} showProject={false} allowContinue />
            {entries.length > limit && (
              <Button variant="secondary" className="self-center" onClick={() => setLimit((l) => l + 20)}>
                Show more
              </Button>
            )}
          </>
        ) : (
          <Card>
            <EmptyState title="No time tracked yet" description="Start the timer or add a manual entry for this project." />
          </Card>
        )}
      </section>
    </div>
  );
}

export default withData(ProjectDetailPage);

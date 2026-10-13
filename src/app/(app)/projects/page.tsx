"use client";
import { withData } from "@/components/layout/with-data";
import Link from "next/link";
import { FolderKanban, FolderPlus, LayoutGrid, List, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Project, ProjectStatus } from "@/types";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { STATUS_LABEL, STATUS_TONE } from "@/components/projects/status";
import { useProjectActions } from "@/components/projects/use-project-actions";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Menu } from "@/components/ui/menu";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { useLookups, useProjectStats } from "@/hooks/use-metrics";
import type { ProjectStats } from "@/lib/calculations";
import { formatMoney, formatRate } from "@/lib/format";
import { formatCalendarDate, formatDuration, formatHours } from "@/lib/time";

type StatusFilter = ProjectStatus | "all";
type Sort = "recent" | "name" | "hours" | "deadline";
type View = "cards" | "list";
const VIEW_KEY = "hourbase:projects-view";


function ProjectsPage() {
  const { data } = useData();
  const { openProject } = useAppActions();
  const stats = useProjectStats();
  const { client: clients } = useLookups();
  const [status, setStatus] = useState<StatusFilter>("active");
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [budget, setBudget] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  // Pages render client-side only (after data loads), so reading storage here is safe.
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards";
    } catch {
      return "cards";
    }
  });
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* non-essential */
    }
  };

  const counts = useMemo(() => {
    const c = { all: data.projects.length, active: 0, completed: 0, archived: 0 };
    for (const p of data.projects) c[p.status]++;
    return c;
  }, [data.projects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data.projects.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (clientId && (clientId === "__internal" ? p.clientId : p.clientId !== clientId)) return false;
      if (budget && p.budgetType !== budget) return false;
      if (q) {
        const cn = p.clientId ? clients.get(p.clientId)?.name.toLowerCase() ?? "" : "internal";
        if (!p.name.toLowerCase().includes(q) && !cn.includes(q) && !(p.description ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const s = (p: Project) => stats.get(p.id);
    return list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "hours":
          return (s(b)?.totalSeconds ?? 0) - (s(a)?.totalSeconds ?? 0);
        case "deadline":
          return (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999");
        default:
          return (s(b)?.lastTrackedAt ?? b.createdAt).localeCompare(s(a)?.lastTrackedAt ?? a.createdAt);
      }
    });
  }, [data.projects, status, clientId, budget, query, sort, stats, clients]);

  const filtersActive = Boolean(query || clientId || budget);
  const usedClients = [...new Set(data.projects.map((p) => p.clientId).filter((x): x is string => Boolean(x)))]
    .map((id) => clients.get(id))
    .filter((c) => c !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        description="Budgets, estimates and what each project actually earns per hour."
        actions={
          <Button icon={<FolderPlus className="size-4" aria-hidden />} onClick={() => openProject()}>
            New project
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            className="max-w-full overflow-x-auto"
            options={(["active", "completed", "archived", "all"] as const).map((s) => ({ value: s, label: `${s === "all" ? "All" : STATUS_LABEL[s]} ${counts[s]}` }))}
          />
          <Segmented
            label="View"
            size="sm"
            value={view}
            onChange={changeView}
            options={[
              { value: "cards", label: "Cards", icon: <LayoutGrid className="size-3.5" aria-hidden /> },
              { value: "list", label: "List", icon: <List className="size-3.5" aria-hidden /> },
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_10rem_11rem]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input type="search" aria-label="Search projects" placeholder="Search projects or clients…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select aria-label="Filter by client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">All clients</option>
            {usedClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__internal">Internal</option>
          </Select>
          <Select aria-label="Filter by budget type" value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="">Any budget</option>
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed price</option>
          </Select>
          <Select aria-label="Sort projects" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recent">Recently tracked</option>
            <option value="name">Name A–Z</option>
            <option value="hours">Most hours</option>
            <option value="deadline">Deadline</option>
          </Select>
        </div>
      </div>

      {!data.projects.length ? (
        <div className="rounded-2xl border border-dashed border-line-strong">
          <EmptyState
            icon={<FolderKanban className="size-5" aria-hidden />}
            title="No projects yet"
            description="Create a project with an hourly rate or a fixed fee to start tracking profitability."
            action={<Button onClick={() => openProject()}>Create a project</Button>}
          />
        </div>
      ) : !visible.length ? (
        <div className="rounded-2xl border border-dashed border-line-strong">
          <EmptyState
            icon={<Search className="size-5" aria-hidden />}
            title="No projects match"
            description={filtersActive ? "Try clearing the search or filters." : `You have no ${status} projects.`}
            action={
              filtersActive ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setClientId("");
                    setBudget("");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setStatus("all")}>
                  Show all projects
                </Button>
              )
            }
          />
        </div>
      ) : view === "cards" ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} stats={stats.get(p.id)} clientName={p.clientId ? clients.get(p.clientId)?.name : undefined} />
          ))}
        </ul>
      ) : (
        <ProjectTable projects={visible} stats={stats} clientName={(id) => (id ? clients.get(id)?.name : undefined)} />
      )}
    </div>
  );
}

function budgetLabel(p: Project, s: ProjectStats | undefined) {
  if (p.budgetType === "fixed") return `Fixed · ${formatMoney(p.fixedFee ?? 0, p.currency)}`;
  return `Hourly · ${s?.rate ? formatRate(s.rate, p.currency) : "no rate"}`;
}

function ProjectCard({ project: p, stats: s, clientName }: { project: Project; stats?: ProjectStats; clientName?: string }) {
  const { menuItems } = useProjectActions();
  const usage = s?.estimateUsage;
  return (
    <li className="group relative flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong">
      <div aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-b-full" style={{ backgroundColor: p.color }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/projects/${p.id}`} className="flex items-center gap-2 font-semibold text-fg after:absolute after:inset-0 after:rounded-2xl hover:text-accent-text">
            <ColorDot color={p.color} />
            <span className="truncate">{p.name}</span>
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 truncate text-[13px] text-muted">{clientName ?? "Internal"}</span>
            <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
            {p.isDemo && <Badge>Example</Badge>}
          </div>
        </div>
        <div className="relative z-10 -mt-1 -mr-1.5">
          <Menu label={`Actions for ${p.name}`} items={menuItems(p)} />
        </div>
      </div>

      <p className="mt-4 text-xs text-subtle">{budgetLabel(p, s)}</p>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="tabular text-xl font-semibold">{formatDuration(s?.totalSeconds ?? 0)}</span>
        {s?.estimatedSeconds ? <span className="tabular text-xs text-subtle">of {formatHours(s.estimatedSeconds)}h estimated</span> : <span className="text-xs text-subtle">No estimate</span>}
      </div>
      {usage != null && <Progress className="mt-2" value={usage} tone={usage > 1 ? "warning" : usage > 0.85 ? "warning" : "accent"} label={`${Math.round(usage * 100)}% of estimate used`} />}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
        <div>
          <dt className="text-xs text-subtle">Revenue</dt>
          <dd className="tabular mt-0.5 font-medium">{formatMoney(s?.recordedRevenue ?? 0, p.currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-subtle">Effective rate</dt>
          <dd className="tabular mt-0.5 font-medium">{formatRate(s?.effectiveRate, p.currency)}</dd>
        </div>
      </dl>
      {p.deadline && p.status === "active" && <p className="mt-3 text-xs text-subtle">Due {formatCalendarDate(p.deadline, "MMM d, yyyy")}</p>}
    </li>
  );
}

function ProjectTable({ projects, stats, clientName }: { projects: Project[]; stats: Map<string, ProjectStats>; clientName: (id: string | null) => string | undefined }) {
  const { menuItems } = useProjectActions();
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-subtle">
            <th scope="col" className="px-4 py-3 font-medium">Project</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 font-medium">Budget</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Tracked</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Est. used</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Revenue</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Eff. rate</th>
            <th scope="col" className="px-2 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {projects.map((p) => {
            const s = stats.get(p.id);
            return (
              <tr key={p.id} className="hover:bg-hover/40">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="flex items-center gap-2 font-medium hover:text-accent-text">
                    <ColorDot color={p.color} />
                    {p.name}
                  </Link>
                  <p className="ml-4.5 text-xs text-subtle">{clientName(p.clientId) ?? "Internal"}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-muted">{budgetLabel(p, s)}</td>
                <td className="tabular px-4 py-3 text-right">{formatDuration(s?.totalSeconds ?? 0)}</td>
                <td className="tabular px-4 py-3 text-right text-muted">{s?.estimateUsage != null ? `${Math.round(s.estimateUsage * 100)}%` : "—"}</td>
                <td className="tabular px-4 py-3 text-right">{formatMoney(s?.recordedRevenue ?? 0, p.currency)}</td>
                <td className="tabular px-4 py-3 text-right">{formatRate(s?.effectiveRate, p.currency)}</td>
                <td className="px-2 py-3">
                  <Menu label={`Actions for ${p.name}`} items={menuItems(p)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default withData(ProjectsPage);

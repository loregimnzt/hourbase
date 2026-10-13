"use client";
import Link from "next/link";
import { Pencil, Play, Trash } from "lucide-react";
import { useMemo } from "react";
import type { TimeEntry } from "@/types";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { Badge, ColorDot } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { useLookups } from "@/hooks/use-metrics";
import { dayKey, entryDurationSeconds, formatDate, formatDuration, formatTime, todayISO } from "@/lib/time";
import { errorMessage } from "@/lib/utils";

interface EntryListProps {
  entries: TimeEntry[];
  groupByDay?: boolean;
  showProject?: boolean;
  allowContinue?: boolean;
  limit?: number;
}

export function EntryList({ entries, groupByDay = true, showProject = true, allowContinue = false, limit }: EntryListProps) {
  const { data } = useData();
  const settings = data.settings;
  const shown = limit ? entries.slice(0, limit) : entries;

  const groups = useMemo(() => {
    if (!groupByDay) return [{ key: "all", label: "", entries: shown, total: 0 }];
    const map = new Map<string, TimeEntry[]>();
    for (const e of shown) {
      const k = dayKey(e.startedAt, settings.timeZone);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    const today = todayISO(settings.timeZone);
    return [...map.entries()].map(([k, list]) => ({
      key: k,
      label: k === today ? "Today" : formatDate(list[0].startedAt, settings),
      entries: list,
      total: list.reduce((s, e) => s + entryDurationSeconds(e), 0),
    }));
  }, [shown, groupByDay, settings]);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label || "Entries"}>
          {groupByDay && (
            <div className="mb-1.5 flex items-center justify-between px-1 text-xs font-medium tracking-wide text-subtle uppercase">
              <h3>{g.label}</h3>
              <span className="tabular normal-case">{formatDuration(g.total)}</span>
            </div>
          )}
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {g.entries.map((e) => (
              <EntryRow key={e.id} entry={e} showProject={showProject} allowContinue={allowContinue} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryRow({ entry, showProject, allowContinue }: { entry: TimeEntry; showProject: boolean; allowContinue: boolean }) {
  const { data, deleteEntry, startTimer } = useData();
  const { openEditEntry } = useAppActions();
  const { project: projects, client: clients } = useLookups();
  const confirm = useConfirm();
  const toast = useToast();
  const project = projects.get(entry.projectId);
  const client = project?.clientId ? clients.get(project.clientId) : undefined;
  const s = data.settings;

  const onDelete = async () => {
    const ok = await confirm({ title: "Delete this time entry?", description: `“${entry.description || "Untitled"}” (${formatDuration(entryDurationSeconds(entry))}) will be permanently removed and all totals will update.`, confirmLabel: "Delete entry" });
    if (!ok) return;
    try {
      await deleteEntry(entry.id);
      toast.success("Entry deleted");
    } catch (e) {
      toast.error("Couldn't delete entry", errorMessage(e));
    }
  };

  const onContinue = async () => {
    try {
      await startTimer({ projectId: entry.projectId, description: entry.description, notes: null, billable: entry.billable });
      toast.success("Timer started", entry.description || project?.name);
    } catch (e) {
      if (!(e instanceof Error && e.name.startsWith("Timer"))) toast.error("Couldn't start timer", errorMessage(e));
    }
  };

  const canContinue = allowContinue && !data.activeTimer && project?.status === "active";

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover/50 sm:gap-4">
      <ColorDot color={project?.color ?? "var(--subtle)"} />
      <button type="button" onClick={() => openEditEntry(entry)} className="min-w-0 flex-1 text-left" aria-label={`Edit entry: ${entry.description || "Untitled"}`}>
        <p className="truncate text-sm font-medium text-fg">{entry.description || <span className="text-subtle italic">No description</span>}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 truncate text-xs text-subtle">
          {showProject && (
            <span className="truncate">
              {project?.name ?? "Unknown project"}
              {client ? ` · ${client.name}` : ""}
            </span>
          )}
          <span className="tabular sm:hidden">
            {showProject && "· "}
            {formatTime(entry.startedAt, s)}–{formatTime(entry.endedAt, s)}
          </span>
        </p>
      </button>
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {entry.isDemo && <Badge>Example</Badge>}
        {entry.billable ? <Badge tone="success">Billable</Badge> : <Badge>Non-billable</Badge>}
      </div>
      <span className="tabular hidden min-w-28 shrink-0 text-right text-xs whitespace-nowrap text-subtle sm:block">
        {formatTime(entry.startedAt, s)}–{formatTime(entry.endedAt, s)}
      </span>
      <span className="tabular w-16 shrink-0 text-right text-sm font-semibold text-fg">{formatDuration(entryDurationSeconds(entry))}</span>
      <div className="flex shrink-0 items-center gap-0.5 sm:opacity-60 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        {canContinue && (
          <button type="button" onClick={onContinue} aria-label="Start a timer for this task again" title="Continue this task" className="rounded-lg p-1.5 text-subtle hover:bg-hover hover:text-success">
            <Play className="size-4" aria-hidden />
          </button>
        )}
        <button type="button" onClick={() => openEditEntry(entry)} aria-label="Edit entry" title="Edit" className="hidden rounded-lg p-1.5 text-subtle hover:bg-hover hover:text-fg sm:block">
          <Pencil className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={onDelete} aria-label="Delete entry" title="Delete" className="rounded-lg p-1.5 text-subtle hover:bg-danger-soft hover:text-danger">
          <Trash className="size-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

export function ProjectLink({ id, name }: { id: string; name: string }) {
  return (
    <Link href={`/projects/${id}`} className="hover:text-accent-text">
      {name}
    </Link>
  );
}

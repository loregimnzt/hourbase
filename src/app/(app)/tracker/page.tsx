"use client";
import { withData } from "@/components/layout/with-data";
import { Info, Plus, Search, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { EntryList } from "@/components/entries/entry-list";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { ActiveTimerCard } from "@/components/tracker/active-timer-card";
import { TimerStartForm } from "@/components/tracker/timer-start-form";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/segmented";
import { entryDurationSeconds, entryInRange, formatDuration, getRange } from "@/lib/time";

type ListRange = "week" | "last30" | "all";
const PAGE = 50;

function TrackerPage() {
  const { data } = useData();
  const { openNewEntry } = useAppActions();
  const { settings } = data;
  const [range, setRange] = useState<ListRange>("week");
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const filtered = useMemo(() => {
    const r = range === "all" ? null : getRange(range, { timeZone: settings.timeZone, weekStartsOn: settings.weekStartsOn });
    const q = query.trim().toLowerCase();
    const names = new Map(data.projects.map((p) => [p.id, p.name.toLowerCase()]));
    return data.entries.filter(
      (e) =>
        (!r || entryInRange(e, r)) &&
        (!projectId || e.projectId === projectId) &&
        (!q || e.description.toLowerCase().includes(q) || (e.notes ?? "").toLowerCase().includes(q) || (names.get(e.projectId) ?? "").includes(q)),
    );
  }, [data.entries, data.projects, settings, range, query, projectId]);

  const total = filtered.reduce((s, e) => s + entryDurationSeconds(e), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Time Tracker"
        description="Track live with the timer, or log time you already worked."
        actions={
          <Button variant="secondary" icon={<Plus className="size-4" aria-hidden />} onClick={() => openNewEntry()}>
            Manual entry
          </Button>
        }
      />

      {data.activeTimer ? <ActiveTimerCard /> : <TimerStartForm />}

      <p className="-mt-3 flex items-start gap-2 px-1 text-xs text-subtle">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        One timer per account. Every open tab shows the same timer and can control it; starting a second timer is blocked. Elapsed time is calculated from saved timestamps, so refreshing or closing the tab never loses time.
      </p>

      <section aria-labelledby="entries-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="entries-heading" className="text-[15px] font-semibold">
              Time entries
            </h2>
            <p className="tabular text-[13px] text-muted">
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"} · {formatDuration(total)}
            </p>
          </div>
          <Segmented
            label="Entries range"
            size="sm"
            value={range}
            onChange={(v) => {
              setRange(v);
              setLimit(PAGE);
            }}
            options={[
              { value: "week", label: "This week" },
              { value: "last30", label: "30 days" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_16rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input type="search" aria-label="Search entries" placeholder="Search descriptions, notes, projects…" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select aria-label="Filter by project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {[...data.projects]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.status !== "active" ? ` (${p.status})` : ""}
                </option>
              ))}
          </Select>
        </div>

        {filtered.length ? (
          <>
            <EntryList entries={filtered} limit={limit} allowContinue />
            {filtered.length > limit && (
              <Button variant="secondary" className="self-center" onClick={() => setLimit((l) => l + PAGE)}>
                Show more ({filtered.length - limit} remaining)
              </Button>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-line-strong">
            <EmptyState
              icon={<Timer className="size-5" aria-hidden />}
              title={query || projectId ? "No entries match your filters" : "No time tracked in this period"}
              description={query || projectId ? "Try a different search or project." : "Start the timer above or add a manual entry."}
              action={
                query || projectId ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      setProjectId("");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => openNewEntry()}>
                    Add manual entry
                  </Button>
                )
              }
            />
          </div>
        )}
      </section>
    </div>
  );
}

export default withData(TrackerPage);

"use client";
import Link from "next/link";
import { Pause, Play, Square, Trash } from "lucide-react";
import { useState } from "react";
import { useData } from "@/components/providers/data-provider";
import { ProjectPicker } from "@/components/shared/project-picker";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useNow } from "@/hooks/use-now";
import { formatClock, getElapsedMs } from "@/lib/timer";
import { formatDuration, formatTime } from "@/lib/time";
import { cn, errorMessage, nullable } from "@/lib/utils";

const isTimerSyncError = (e: unknown) => e instanceof Error && (e.name === "TimerGoneError" || e.name === "TimerConflictError");

/** Live controls for the running or paused timer. */
export function ActiveTimerCard({ compact = false }: { compact?: boolean }) {
  const { data, pauseTimer, resumeTimer, stopTimer, discardTimer, updateTimerDetails } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const timer = data.activeTimer;
  const now = useNow(1000, Boolean(timer));
  const [busy, setBusy] = useState<string | null>(null);

  // Editable details while the timer runs.
  const [description, setDescription] = useState(timer?.description ?? "");
  const [notes, setNotes] = useState(timer?.notes ?? "");
  const [clientId, setClientId] = useState("");
  // Re-sync the inputs when the stored timer changes (e.g. edited in another tab).
  const sourceKey = `${timer?.id}|${timer?.description}|${timer?.notes}`;
  const [syncedKey, setSyncedKey] = useState(sourceKey);
  if (syncedKey !== sourceKey) {
    setSyncedKey(sourceKey);
    setDescription(timer?.description ?? "");
    setNotes(timer?.notes ?? "");
  }

  if (!timer) return null;
  const project = data.projects.find((p) => p.id === timer.projectId);
  const client = project?.clientId ? data.clients.find((c) => c.id === project.clientId) : undefined;
  const elapsed = Math.floor(getElapsedMs(timer, now) / 1000);
  const running = timer.status === "running";

  const run = async (key: string, fn: () => Promise<unknown>, success?: string, detail?: string) => {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success, detail);
    } catch (e) {
      if (!isTimerSyncError(e)) toast.error("Timer action failed", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const saveDetails = () => {
    const d = description.trim();
    const n = nullable(notes);
    if (d === timer.description && n === timer.notes) return;
    void run("details", () => updateTimerDetails({ description: d, notes: n }));
  };

  const onStop = () => {
    if (elapsed < 1) return;
    void run("stop", stopTimer, "Session saved", `${formatDuration(elapsed)} on ${project?.name ?? "project"}`);
  };

  const onDiscard = async () => {
    const ok = await confirm({ title: "Discard this session?", description: `The ${formatClock(elapsed)} you've tracked will not be saved.`, confirmLabel: "Discard session" });
    if (ok) void run("discard", discardTimer, "Session discarded");
  };

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      {running ? (
        <Button variant="secondary" size="lg" loading={busy === "pause"} disabled={Boolean(busy)} icon={<Pause className="size-4.5" aria-hidden />} onClick={() => run("pause", pauseTimer)}>
          Pause
        </Button>
      ) : (
        <Button variant="success" size="lg" loading={busy === "resume"} disabled={Boolean(busy)} icon={<Play className="size-4.5 fill-current" aria-hidden />} onClick={() => run("resume", resumeTimer)}>
          Resume
        </Button>
      )}
      <Button size="lg" loading={busy === "stop"} disabled={Boolean(busy) || elapsed < 1} icon={<Square className="size-4 fill-current" aria-hidden />} onClick={onStop}>
        Stop &amp; save
      </Button>
    </div>
  );

  return (
    <section aria-label="Active timer" className={cn("relative overflow-hidden rounded-2xl border bg-surface shadow-card", running ? "border-success/30" : "border-warning/30")}>
      <div aria-hidden className={cn("absolute inset-x-0 top-0 h-0.5", running ? "bg-success" : "bg-warning")} />
      <div className={cn("flex flex-col gap-5 p-5 sm:p-6", compact && "lg:flex-row lg:items-center lg:justify-between")}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={running ? "success" : "warning"}>{running ? "Running" : "Paused"}</Badge>
            <span className="text-xs text-subtle">
              Started {formatTime(timer.startedAt, data.settings)}
              {!running && timer.pausedAt && ` · paused at ${formatTime(timer.pausedAt, data.settings)}`}
            </span>
          </div>
          <p className="tabular mt-3 font-mono text-5xl font-semibold tracking-tight text-fg sm:text-6xl" aria-live="off">
            {formatClock(elapsed)}
          </p>
          <p className="sr-only" aria-live="polite">
            {running ? "Timer running" : "Timer paused"}
          </p>
          {compact && (
            <p className="mt-2 flex items-center gap-2 truncate text-sm text-muted">
              {project && <ColorDot color={project.color} />}
              <span className="truncate">
                {timer.description || "No description"} · {project?.name ?? "Unknown project"}
                {client ? ` · ${client.name}` : ""}
              </span>
            </p>
          )}
        </div>
        {compact ? (
          <div className="flex flex-wrap items-center gap-2">
            {controls}
            <Link href="/tracker" className="px-2 text-[13px] font-medium text-accent-text hover:underline">
              Edit details
            </Link>
          </div>
        ) : (
          controls
        )}
      </div>

      {!compact && (
        <div className="flex flex-col gap-4 border-t border-line bg-bg/30 p-5 sm:p-6">
          <ProjectPicker
            clients={data.clients}
            projects={data.projects}
            clientId={clientId || (project ? project.clientId ?? "__internal" : "")}
            projectId={timer.projectId}
            includeProjectId={timer.projectId}
            disabled={Boolean(busy)}
            onClientChange={setClientId}
            onProjectChange={(id, cid) => {
              setClientId(cid);
              if (id && id !== timer.projectId) void run("details", () => updateTimerDetails({ projectId: id }));
            }}
          />
          <Field label="Task description">
            {(a) => <Input {...a} value={description} onChange={(e) => setDescription(e.target.value)} onBlur={saveDetails} onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }} placeholder="What are you working on?" maxLength={300} />}
          </Field>
          <Switch checked={timer.billable} onChange={(v) => run("details", () => updateTimerDetails({ billable: v }))} label="Billable" disabled={Boolean(busy)} />
          <Field label="Notes" optional>
            {(a) => <Textarea {...a} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveDetails} maxLength={2000} />}
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-subtle">Changes save automatically. Paused time isn&apos;t counted.</p>
            <Button variant="ghost" size="sm" className="text-danger hover:text-danger" icon={<Trash className="size-4" aria-hidden />} onClick={onDiscard} disabled={Boolean(busy)}>
              Discard session
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

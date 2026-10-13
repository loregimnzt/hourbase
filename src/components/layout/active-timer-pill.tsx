"use client";
import Link from "next/link";
import { Pause, Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { useData } from "@/components/providers/data-provider";
import { ColorDot } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useNow } from "@/hooks/use-now";
import { BRAND } from "@/lib/brand";
import { formatClock, getElapsedMs } from "@/lib/timer";
import { formatDuration } from "@/lib/time";
import { cn, errorMessage } from "@/lib/utils";

/** Compact, always-visible indicator of the running/paused timer. */
export function ActiveTimerPill({ className }: { className?: string }) {
  const { data, pauseTimer, resumeTimer, stopTimer } = useData();
  const toast = useToast();
  const timer = data.activeTimer;
  const now = useNow(1000, Boolean(timer));
  const [busy, setBusy] = useState(false);
  const project = timer ? data.projects.find((p) => p.id === timer.projectId) : undefined;
  const seconds = timer ? Math.floor(getElapsedMs(timer, now) / 1000) : 0;

  useEffect(() => {
    if (!timer) {
      document.title = BRAND.name;
      return;
    }
    document.title = `${timer.status === "running" ? "▶" : "❚❚"} ${formatClock(seconds)} · ${project?.name ?? BRAND.name}`;
  }, [timer, seconds, project?.name]);

  if (!timer) {
    return (
      <Link href="/tracker" className={buttonClasses("secondary", "sm", cn("gap-1.5", className))}>
        <Play className="size-3.5 fill-current" aria-hidden />
        Start timer
      </Link>
    );
  }

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      if (done) toast.success(done);
    } catch (e) {
      if (!(e instanceof Error && e.name.startsWith("Timer"))) toast.error("Timer action failed", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const running = timer.status === "running";
  return (
    <div className={cn("flex h-9 items-center gap-1 rounded-xl border border-line-strong bg-elevated pr-1 pl-3", className)} role="group" aria-label="Active timer">
      <Link href="/tracker" className="flex min-w-0 items-center gap-2" title="Open time tracker">
        <span className="relative flex size-2.5 shrink-0">
          {running && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
          <ColorDot color={running ? "var(--success)" : "var(--warning)"} className="relative" />
        </span>
        <span className="hidden max-w-36 truncate text-[13px] text-muted md:inline">{project?.name ?? "Timer"}</span>
        <span className="tabular font-mono text-[13px] font-semibold text-fg" aria-label={`Elapsed ${formatDuration(seconds)}${running ? "" : ", paused"}`}>
          {formatClock(seconds)}
        </span>
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(running ? pauseTimer : resumeTimer)}
        aria-label={running ? "Pause timer" : "Resume timer"}
        className="ml-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-50"
      >
        {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(stopTimer, "Session saved")}
        aria-label="Stop and save timer"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      >
        <Square className="size-4" aria-hidden />
      </button>
    </div>
  );
}

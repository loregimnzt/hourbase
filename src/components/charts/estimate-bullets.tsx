import Link from "next/link";
import { formatHours } from "@/lib/time";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface EstimateRow {
  key: string;
  label: string;
  color: string;
  actualSeconds: number;
  estimatedSeconds: number;
  href?: string;
}

/**
 * Bullet bars: the track is the estimate, the fill is actual hours, and any
 * overrun is drawn past the estimate marker in the warning color.
 */
export function EstimateBullets({ rows }: { rows: EstimateRow[] }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-subtle">No projects with an hour estimate in this selection.</p>;
  const scale = Math.max(...rows.map((r) => Math.max(r.actualSeconds, r.estimatedSeconds)));
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => {
        const usage = r.estimatedSeconds > 0 ? r.actualSeconds / r.estimatedSeconds : 0;
        const over = usage > 1;
        const estPct = (r.estimatedSeconds / scale) * 100;
        const actPct = (Math.min(r.actualSeconds, r.estimatedSeconds) / scale) * 100;
        const overPct = over ? ((r.actualSeconds - r.estimatedSeconds) / scale) * 100 : 0;
        const label = (
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="truncate">{r.label}</span>
          </span>
        );
        return (
          <li key={r.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              {r.href ? (
                <Link href={r.href} className="min-w-0 hover:text-accent-text">
                  {label}
                </Link>
              ) : (
                label
              )}
              <span className="tabular shrink-0 text-muted">
                <span className="font-medium text-fg">{formatHours(r.actualSeconds)}h</span> / {formatHours(r.estimatedSeconds)}h
                <span className={cn("ml-2 text-xs", over ? "text-warning" : "text-subtle")}>{formatPercent(usage)}</span>
              </span>
            </div>
            <div className="relative h-2.5" role="img" aria-label={`${r.label}: ${formatHours(r.actualSeconds)} of ${formatHours(r.estimatedSeconds)} estimated hours`}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-elevated" style={{ width: `${estPct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-l-full" style={{ width: `${actPct}%`, backgroundColor: r.color, borderTopRightRadius: over ? 0 : 999, borderBottomRightRadius: over ? 0 : 999 }} />
              {over && <div className="absolute inset-y-0 rounded-r-full bg-warning" style={{ left: `calc(${estPct}% + 2px)`, width: `calc(${overPct}% - 2px)` }} />}
              <div aria-hidden className="absolute -inset-y-1 w-0.5 rounded bg-fg/70" style={{ left: `calc(${estPct}% - 1px)` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

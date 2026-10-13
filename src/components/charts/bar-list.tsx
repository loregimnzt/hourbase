import Link from "next/link";
import type { ReactNode } from "react";

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  display: ReactNode;
  sub?: ReactNode;
  color?: string;
  href?: string;
}

/** Horizontal bars with direct labels — readable without color or hover. */
export function BarList({ items, emptyLabel = "No data for this period." }: { items: BarListItem[]; emptyLabel?: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (!items.length || max <= 0) return <p className="py-6 text-center text-sm text-subtle">{emptyLabel}</p>;
  return (
    <ul className="flex flex-col gap-3.5">
      {items.map((i) => {
        const label = (
          <span className="flex min-w-0 items-center gap-2">
            {i.color && <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: i.color }} />}
            <span className="truncate">{i.label}</span>
          </span>
        );
        return (
          <li key={i.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              {i.href ? (
                <Link href={i.href} className="min-w-0 text-fg hover:text-accent-text">
                  {label}
                </Link>
              ) : (
                <span className="min-w-0 text-fg">{label}</span>
              )}
              <span className="tabular shrink-0 text-right text-muted">
                <span className="font-medium text-fg">{i.display}</span>
                {i.sub && <span className="ml-2 text-xs text-subtle">{i.sub}</span>}
              </span>
            </div>
            <div aria-hidden className="h-2 overflow-hidden rounded-full bg-elevated">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(1.5, (i.value / max) * 100)}%`, backgroundColor: i.color ?? "var(--accent)" }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

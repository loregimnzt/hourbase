import type { ReactNode } from "react";

export function TooltipCard({ title, rows }: { title: ReactNode; rows: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="min-w-40 rounded-xl border border-line-strong bg-elevated px-3 py-2.5 text-xs shadow-card">
      <p className="mb-1.5 font-medium text-fg">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              {r.color && <span aria-hidden className="size-2 rounded-sm" style={{ backgroundColor: r.color }} />}
              {r.label}
            </span>
            <span className="tabular font-medium text-fg">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ backgroundColor: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

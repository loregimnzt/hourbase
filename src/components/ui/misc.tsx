import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-elevated", className)} />;
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      {icon && <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">{icon}</div>}
      <div className="max-w-sm">
        <p className="font-medium text-fg">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Progress({ value, tone = "accent", label, className }: { value: number; tone?: "accent" | "success" | "warning" | "danger"; label: string; className?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  const color = { accent: "bg-accent", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-elevated", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", color)} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger-soft p-5 text-sm text-fg">
      <p className="font-medium text-danger">Something went wrong</p>
      <p className="mt-1 text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-line-strong px-3 py-1.5 text-[13px] font-medium hover:bg-hover">
          Try again
        </button>
      )}
    </div>
  );
}

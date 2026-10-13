import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-line bg-surface shadow-card", className)} {...rest} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

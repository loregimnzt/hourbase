import type { ReactNode } from "react";
import { InfoTip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, sub, icon, info, className }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; info?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          {label}
          {info && <InfoTip label={`About ${label}`}>{info}</InfoTip>}
        </p>
        {icon && <span className="text-subtle">{icon}</span>}
      </div>
      <p className="tabular mt-2.5 text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">{value}</p>
      {sub && <p className="mt-1 text-xs text-subtle">{sub}</p>}
    </div>
  );
}

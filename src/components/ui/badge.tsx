import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-elevated text-muted border-line-strong",
  accent: "bg-accent-soft text-accent-text border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

export function Badge({ tone = "neutral", children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex h-5.5 items-center gap-1 rounded-full border px-2 text-[11px] font-medium whitespace-nowrap", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} />;
}

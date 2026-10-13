"use client";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  id?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, id, disabled }: SwitchProps) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4", disabled && "cursor-not-allowed opacity-60")}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="block text-xs text-subtle">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-10 shrink-0 rounded-full border transition-colors", checked ? "border-success bg-success" : "border-line-strong bg-elevated")}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-4.5 rounded-full bg-white shadow transition-transform", checked && "translate-x-4")} />
        <span className="sr-only">{label}</span>
      </button>
    </label>
  );
}

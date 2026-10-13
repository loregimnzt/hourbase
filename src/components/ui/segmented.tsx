"use client";
import { type KeyboardEvent, useRef } from "react";
import { cn } from "@/lib/utils";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/** Accessible single-select segmented control (radiogroup with roving focus). */
export function Segmented<T extends string>({ options, value, onChange, label, size = "md", className }: { options: Option<T>[]; value: T; onChange: (v: T) => void; label: string; size?: "sm" | "md"; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = (i + dir + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-xl border border-line bg-bg/50 p-0.5", className)}>
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => onKey(e, i)}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[10px] font-medium whitespace-nowrap transition-colors",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              active ? "bg-elevated text-fg shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

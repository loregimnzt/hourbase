"use client";
import { Info } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";

/** Small info icon that reveals an explanation on hover, focus or tap. */
export function InfoTip({ children, label = "More information", className }: { children: ReactNode; label?: string; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className={cn("relative inline-flex", className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="inline-flex size-4.5 items-center justify-center rounded-full text-subtle transition-colors hover:text-fg"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 animate-fade-in rounded-xl border border-line-strong bg-elevated px-3 py-2 text-left text-xs leading-relaxed font-normal text-muted shadow-card"
        >
          {children}
        </span>
      )}
    </span>
  );
}

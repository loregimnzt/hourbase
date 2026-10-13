"use client";
import { Ellipsis } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** Accessible overflow menu: arrow keys move, Escape closes, focus returns to trigger. */
export function Menu({ items, label, align = "end" }: { items: MenuItem[]; label: string; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    itemRefs.current.find((el) => el && !el.disabled)?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = itemRefs.current.filter((el): el is HTMLButtonElement => Boolean(el && !el.disabled));
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="rounded-lg p-1.5 text-subtle transition-colors hover:bg-hover hover:text-fg"
      >
        <Ellipsis className="size-4.5" aria-hidden />
      </button>
      {open && (
        <div id={id} role="menu" aria-label={label} className={cn("absolute top-full z-40 mt-1 min-w-48 animate-fade-in rounded-xl border border-line-strong bg-elevated p-1 shadow-card", align === "end" ? "right-0" : "left-0")}>
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors disabled:opacity-40",
                item.danger ? "text-danger hover:bg-danger-soft focus:bg-danger-soft" : "text-fg hover:bg-hover focus:bg-hover",
                "focus:outline-none",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

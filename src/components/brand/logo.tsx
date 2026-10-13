import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Clock-in-a-tile mark. Swap this SVG and BRAND.name to rebrand. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="var(--accent-fg)" strokeWidth="2.4" />
      <path d="M16 11v5.2l3.4 2.2" fill="none" stroke="var(--accent-fg)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && <span className="text-[17px] font-semibold tracking-tight text-fg">{BRAND.name}</span>}
    </span>
  );
}

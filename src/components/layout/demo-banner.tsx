"use client";
import Link from "next/link";
import { HardDrive } from "lucide-react";
import { useData } from "@/components/providers/data-provider";

/** Persistent, honest notice that demo data never leaves this browser. */
export function DemoBanner() {
  const { mode, data } = useData();
  if (mode !== "demo") return null;
  const hasExamples = data.entries.some((e) => e.isDemo) || data.projects.some((p) => p.isDemo);
  return (
    <div className="border-b border-accent/20 bg-accent-soft">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-[13px] text-muted sm:px-6 lg:px-8">
        <HardDrive className="size-3.5 shrink-0 text-accent-text" aria-hidden />
        <span>
          <strong className="font-medium text-fg">Demo mode.</strong> Data is saved only in this browser{hasExamples ? " and includes example records" : ""}. Nothing is sent to a server.
        </span>
        <Link href="/settings#data" className="font-medium text-accent-text underline-offset-2 hover:underline">
          Manage demo data
        </Link>
      </div>
    </div>
  );
}

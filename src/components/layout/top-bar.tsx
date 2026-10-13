"use client";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { useAppActions } from "@/components/providers/app-actions";
import { Button } from "@/components/ui/button";
import { ActiveTimerPill } from "./active-timer-pill";

export function TopBar() {
  const { openNewEntry } = useAppActions();
  return (
    <div className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
        <Link href="/overview" className="lg:hidden" aria-label="Hourbase home">
          <LogoMark className="size-7" />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ActiveTimerPill />
          <div className="hidden sm:block">
            <Button variant="secondary" size="sm" icon={<Plus className="size-4" aria-hidden />} onClick={() => openNewEntry()}>
              Add entry
            </Button>
          </div>
          <Link href="/settings" aria-label="Settings" className="rounded-lg p-2 text-subtle hover:bg-hover hover:text-fg lg:hidden">
            <Settings className="size-5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

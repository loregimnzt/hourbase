"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath } from "./nav-items";

/** Bottom tab bar for phones and tablets. Settings lives in the top bar. */
export function MobileNav() {
  return (
    <Suspense fallback={<MobileNavLinks pathname="" />}>
      <ActiveMobileNav />
    </Suspense>
  );
}

function ActiveMobileNav() {
  return <MobileNavLinks pathname={usePathname()} />;
}

function MobileNavLinks({ pathname }: { pathname: string }) {
  const items = NAV_ITEMS.filter((i) => i.href !== "/settings");
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-accent-text" : "text-subtle hover:text-fg")}
              >
                <Icon className="size-5" aria-hidden />
                {"short" in item ? item.short : item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

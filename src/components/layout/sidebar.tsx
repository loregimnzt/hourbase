"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath } from "./nav-items";
import { UserMenu } from "./user-menu";

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active ? "bg-accent-soft text-fg" : "text-muted hover:bg-hover hover:text-fg",
              )}
            >
              <Icon className={cn("size-4.5", active ? "text-accent-text" : "text-subtle group-hover:text-muted")} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/60 lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/overview" aria-label="Hourbase home">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Main" className="flex-1 px-3 py-2">
        <Suspense fallback={<NavLinks pathname="" />}>
          <ActiveNavLinks />
        </Suspense>
      </nav>
      <div className="border-t border-line p-3">
        <UserMenu />
      </div>
    </aside>
  );
}

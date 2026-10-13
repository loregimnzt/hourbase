"use client";
import type { ReactNode } from "react";
import { AppActionsProvider } from "@/components/providers/app-actions";
import { DataProvider, useData } from "@/components/providers/data-provider";
import { ThemeController } from "@/components/providers/theme-controller";
import { DemoBanner } from "./demo-banner";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

function ShellContent({ children }: { children: ReactNode }) {
  const { status, data } = useData();
  return (
    <>
      <ThemeController theme={status === "ready" ? data.settings.theme : "dark"} />
      <Sidebar />
      <div className="flex min-h-dvh flex-col lg:pl-64">
        <DemoBanner />
        <TopBar />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileNav />
    </>
  );
}


export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DataProvider>
      <AppActionsProvider>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg">
          Skip to content
        </a>
        <ShellContent>{children}</ShellContent>
      </AppActionsProvider>
    </DataProvider>
  );
}

"use client";
import type { ComponentType } from "react";
import { useData } from "@/components/providers/data-provider";
import { ErrorState, Skeleton } from "@/components/ui/misc";

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

/**
 * Wrap a page so it renders a skeleton until data has loaded (and an error
 * state if loading fails). The page segment itself always renders, which keeps
 * Next.js's static-shell and navigation validation happy.
 */
export function withData<P extends object>(Page: ComponentType<P>) {
  function DataPage(props: P) {
    const { status, error, reload } = useData();
    if (status === "loading") return <LoadingSkeleton />;
    if (status === "error") return <ErrorState message={error ?? "Couldn't load your data."} onRetry={() => void reload()} />;
    return <Page {...props} />;
  }
  DataPage.displayName = `withData(${Page.displayName ?? Page.name})`;
  return DataPage;
}

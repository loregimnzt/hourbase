"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useData } from "@/components/providers/data-provider";
import { useToast } from "@/components/ui/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/utils";

export function UserMenu() {
  const { data, mode } = useData();
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const name = data.settings.displayName || "You";

  const signOut = async () => {
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (e) {
      toast.error("Couldn't sign out", errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-text">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-fg">{name}</p>
        <p className="truncate text-xs text-subtle">{mode === "demo" ? "Demo workspace" : data.settings.email}</p>
      </div>
      {mode === "supabase" && (
        <button type="button" onClick={signOut} disabled={busy} aria-label="Sign out" title="Sign out" className="rounded-lg p-1.5 text-subtle hover:bg-hover hover:text-fg disabled:opacity-50">
          <LogOut className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

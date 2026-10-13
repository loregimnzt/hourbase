import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

let browserClient: SupabaseClient | null = null;

/** Singleton browser client. Only call when Supabase is configured. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured.");
  browserClient ??= createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return browserClient;
}

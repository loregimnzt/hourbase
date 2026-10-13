import { type NextRequest, NextResponse } from "next/server";
import { safeNext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Exchanges the one-time code from email links (sign-up, password reset) for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");

  if (!isSupabaseConfigured) return NextResponse.redirect(new URL("/overview", origin));
  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}

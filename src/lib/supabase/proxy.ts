import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/auth"];

/**
 * Refreshes the Supabase session cookie and redirects signed-out users away
 * from app routes. This is an optimistic check for UX — authorization is
 * enforced by Row Level Security in the database.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!signedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = path && path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
    return NextResponse.redirect(url);
  }
  if (signedIn && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

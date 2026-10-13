/** Only allow same-site relative redirects (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/overview"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

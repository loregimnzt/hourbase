/** Join class names, skipping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // RFC 4122 v4 fallback for very old browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Empty / whitespace strings become null. */
export function nullable(v: string | null | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return fallback;
}

/** RFC 4180 CSV helpers. */
export function csvEscape(value: unknown): string {
  if (value == null) return "";
  let s = String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

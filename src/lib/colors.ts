/**
 * Preset project colors. Validated as a categorical palette (colorblind-safe
 * adjacent pairs, ≥3:1 contrast) against the dark card surface #1C1D29.
 * Order matters: new projects take the next color in sequence.
 */
export const PROJECT_COLORS = ["#8B79C6", "#3FA88A", "#C07D3E", "#4C86C9", "#C2607F", "#979330", "#1F9AB0"] as const;

export function nextProjectColor(used: string[]): string {
  const counts = PROJECT_COLORS.map((c) => used.filter((u) => u.toLowerCase() === c.toLowerCase()).length);
  const min = Math.min(...counts);
  return PROJECT_COLORS[counts.indexOf(min)];
}

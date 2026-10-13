import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay } from "date-fns";
import type { AppData, Client, Project, Settings, TimeEntry } from "@/types";
import { PROJECT_COLORS } from "@/lib/colors";

/**
 * Realistic example data for demo mode, generated relative to "now" so the
 * dashboard always has a current week to show. Every record is flagged
 * `isDemo: true` so the UI can label it and the user can clear it.
 */

// Small deterministic PRNG so the demo looks the same on every reset.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let counter = 0;
const id = (prefix: string) => `demo-${prefix}-${(++counter).toString(36)}`;

export function defaultSettings(timeZone: string): Settings {
  return {
    displayName: "Alex",
    email: null,
    currency: "USD",
    timeZone,
    weekStartsOn: 1,
    dateFormat: "MMM d, yyyy",
    timeFormat: "24h",
    defaultHourlyRate: 80,
    theme: "dark",
  };
}

interface ProjectSeed {
  key: string;
  client: string | null;
  name: string;
  description: string;
  status: Project["status"];
  budgetType: Project["budgetType"];
  fixedFee?: number;
  hourlyRate?: number;
  estimatedHours?: number;
  currency: Project["currency"];
  /** Days ago the project started / ended (end undefined = ongoing). */
  from: number;
  to?: number;
  weight: number;
  billableShare: number;
  tasks: string[];
}

const PROJECTS: ProjectSeed[] = [
  {
    key: "lumen", client: "lumen", name: "Patient App Redesign", description: "End-to-end redesign of the iOS and Android patient portal.",
    status: "active", budgetType: "hourly", hourlyRate: 95, estimatedHours: 140, currency: "USD", from: 52, weight: 5, billableShare: 0.92,
    tasks: ["Appointment flow wireframes", "Usability test synthesis", "Design review with PM", "Hi-fi screens: onboarding", "Prototype interactions", "Accessibility pass", "Handoff specs for engineering"],
  },
  {
    key: "atlas-brand", client: "atlas", name: "Brand Identity Refresh", description: "Logo refinement, typography system and brand guidelines.",
    status: "active", budgetType: "fixed", fixedFee: 6500, estimatedHours: 55, currency: "USD", from: 40, weight: 4, billableShare: 1,
    tasks: ["Logo exploration", "Typography pairing", "Color system", "Brand guidelines layout", "Client presentation prep", "Revisions round 2"],
  },
  {
    key: "northwind-web", client: "northwind", name: "Webflow Site Build", description: "Marketing site build in Webflow from approved designs.",
    status: "active", budgetType: "hourly", hourlyRate: 85, estimatedHours: 80, currency: "USD", from: 24, weight: 3, billableShare: 0.85,
    tasks: ["CMS collections setup", "Home page build", "Responsive QA", "Interactions and animations", "SEO metadata", "Client walkthrough call"],
  },
  {
    key: "pine-audit", client: "pine", name: "Design System Audit", description: "Audit of component library and token structure.",
    status: "completed", budgetType: "fixed", fixedFee: 4200, estimatedHours: 35, currency: "EUR", from: 56, to: 30, weight: 3, billableShare: 1,
    tasks: ["Component inventory", "Token audit", "Findings report", "Workshop with design team"],
  },
  {
    key: "atlas-pack", client: "atlas", name: "Packaging Illustrations", description: "Illustration set for the seasonal coffee range.",
    status: "completed", budgetType: "fixed", fixedFee: 2800, estimatedHours: 30, currency: "USD", from: 56, to: 35, weight: 2, billableShare: 1,
    tasks: ["Sketches", "Final illustrations", "Print file prep"],
  },
  {
    key: "northwind-retainer", client: "northwind", name: "Monthly Support Retainer", description: "Ad-hoc design support (ended last quarter).",
    status: "archived", budgetType: "hourly", hourlyRate: 90, currency: "USD", from: 56, to: 42, weight: 1, billableShare: 1,
    tasks: ["Social graphics", "Landing page tweaks", "Email template update"],
  },
  {
    key: "internal", client: null, name: "Studio Admin", description: "Invoicing, portfolio updates and business development.",
    status: "active", budgetType: "hourly", currency: "USD", from: 56, weight: 1.2, billableShare: 0,
    tasks: ["Invoicing and bookkeeping", "Portfolio case study", "New client proposal", "Inbox and scheduling"],
  },
];

export function buildSeed(timeZone: string, now: Date = new Date()): AppData {
  counter = 0;
  const rand = mulberry32(20261012);
  const createdAt = addDays(now, -60).toISOString();

  const clientDefs: Record<string, Omit<Client, "id" | "createdAt" | "updatedAt" | "isDemo" | "archived">> = {
    lumen: { name: "Lumen Health", contactName: "Priya Raman", email: "priya@lumenhealth.example", website: "lumenhealth.example", notes: "Prefers async updates via Loom. Net-30 invoicing." },
    atlas: { name: "Atlas Coffee Roasters", contactName: "Marco Bellini", email: "marco@atlascoffee.example", website: "atlascoffee.example", notes: "Fixed-price engagements; 50% upfront." },
    northwind: { name: "Northwind Studio", contactName: "Jamie Chen", email: "jamie@northwind.example", website: "northwind.example", notes: "Agency partner — white-label work." },
    pine: { name: "Pine & Pixel GmbH", contactName: "Lena Vogt", email: "lena@pinepixel.example", website: "pinepixel.example", notes: "Berlin-based. Invoices in EUR." },
  };

  const clientIds: Record<string, string> = {};
  const clients: Client[] = Object.entries(clientDefs).map(([key, c]) => {
    const cid = id("client");
    clientIds[key] = cid;
    return { id: cid, ...c, archived: false, isDemo: true, createdAt, updatedAt: createdAt };
  });

  const todayLocal = startOfDay(new TZDate(now, timeZone));
  const projects: Project[] = PROJECTS.map((p, i) => ({
    id: id("project"),
    clientId: p.client ? clientIds[p.client] : null,
    name: p.name,
    description: p.description,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
    status: p.status,
    startDate: format(addDays(todayLocal, -p.from), "yyyy-MM-dd"),
    deadline: p.to != null ? format(addDays(todayLocal, -p.to), "yyyy-MM-dd") : p.key === "atlas-brand" ? format(addDays(todayLocal, 12), "yyyy-MM-dd") : null,
    budgetType: p.budgetType,
    fixedFee: p.fixedFee ?? null,
    hourlyRate: p.hourlyRate ?? null,
    estimatedHours: p.estimatedHours ?? null,
    currency: p.currency,
    notes: null,
    isDemo: true,
    createdAt,
    updatedAt: createdAt,
  }));

  const entries: TimeEntry[] = [];
  for (let daysAgo = 56; daysAgo >= 0; daysAgo--) {
    const day = addDays(todayLocal, -daysAgo);
    const dow = day.getDay();
    if (dow === 0 || (dow === 6 && rand() > 0.15)) continue; // mostly weekdays

    const candidates = PROJECTS.map((p, i) => ({ p, project: projects[i] })).filter(
      ({ p }) => daysAgo <= p.from && (p.to == null || daysAgo >= p.to),
    );
    if (!candidates.length) continue;

    let cursor = 8.75 + rand() * 1.25; // first block starts 8:45–10:00
    const blocks = 2 + Math.floor(rand() * 3);
    for (let b = 0; b < blocks; b++) {
      const totalWeight = candidates.reduce((s, c) => s + c.p.weight, 0);
      let pick = rand() * totalWeight;
      const chosen = candidates.find((c) => (pick -= c.p.weight) <= 0) ?? candidates[0];
      const hours = Math.round((0.75 + rand() * 2.5) * 4) / 4; // 15-minute granularity
      const startH = cursor;
      const endH = startH + hours;
      if (endH > 19.5) break;
      const start = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(startH), Math.round((startH % 1) * 60), timeZone);
      const end = new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(endH), Math.round((endH % 1) * 60), timeZone);
      if (end.getTime() > now.getTime()) break; // never seed the future
      const breakSeconds = hours >= 2.5 && rand() > 0.5 ? 15 * 60 : 0;
      entries.push({
        id: id("entry"),
        projectId: chosen.project.id,
        description: chosen.p.tasks[Math.floor(rand() * chosen.p.tasks.length)],
        notes: rand() > 0.85 ? "Shared progress in the client channel." : null,
        billable: rand() < chosen.p.billableShare,
        startedAt: new Date(start.getTime()).toISOString(),
        endedAt: new Date(end.getTime()).toISOString(),
        breakSeconds,
        source: rand() > 0.3 ? "timer" : "manual",
        isDemo: true,
        createdAt: new Date(end.getTime()).toISOString(),
        updatedAt: new Date(end.getTime()).toISOString(),
      });
      cursor = endH + 0.25 + rand() * 0.75; // short gap / lunch
      if (cursor > 12 && cursor < 13) cursor += 0.75;
    }
  }

  return {
    clients,
    projects,
    entries: entries.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    settings: { ...defaultSettings(timeZone) },
    activeTimer: null,
  };
}

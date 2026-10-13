/**
 * Core domain types for Hourbase.
 *
 * These are the application-level shapes used by every page and component.
 * Persistence adapters (local demo storage, Supabase) map to and from them,
 * so UI code never sees database row formats.
 */

export type ID = string;

/** ISO 8601 timestamp string (UTC), e.g. "2026-10-12T09:30:00.000Z". */
export type ISODateTime = string;

/** Calendar date string "yyyy-MM-dd" (no time zone). */
export type ISODate = string;

export const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "MXN", "BRL", "JPY"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type ProjectStatus = "active" | "completed" | "archived";
export type BudgetType = "hourly" | "fixed";

export interface Client {
  id: ID;
  name: string;
  contactName: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  archived: boolean;
  isDemo: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Project {
  id: ID;
  /** null = internal / no client. */
  clientId: ID | null;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  startDate: ISODate | null;
  deadline: ISODate | null;
  budgetType: BudgetType;
  /** Agreed fee for fixed-price projects. Ignored for hourly projects. */
  fixedFee: number | null;
  /** Billing rate for hourly projects. Falls back to the user's default rate when null. */
  hourlyRate: number | null;
  estimatedHours: number | null;
  currency: Currency;
  notes: string | null;
  isDemo: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface TimeEntry {
  id: ID;
  projectId: ID;
  description: string;
  notes: string | null;
  billable: boolean;
  startedAt: ISODateTime;
  endedAt: ISODateTime;
  /** Paused / break time inside [startedAt, endedAt], in seconds. */
  breakSeconds: number;
  source: "timer" | "manual";
  isDemo: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type TimerStatus = "running" | "paused";

/**
 * The single active timer for a user.
 *
 * Elapsed time is always derived from timestamps, never from interval ticks:
 *   elapsed = accumulatedMs + (status === "running" ? now - segmentStartedAt : 0)
 */
export interface ActiveTimer {
  id: ID;
  projectId: ID;
  description: string;
  notes: string | null;
  billable: boolean;
  /** When the session first started. */
  startedAt: ISODateTime;
  status: TimerStatus;
  /** Active (non-paused) time accumulated in completed segments, in ms. */
  accumulatedMs: number;
  /** Start of the current running segment; null while paused. */
  segmentStartedAt: ISODateTime | null;
  /** When the timer was paused; null while running. */
  pausedAt: ISODateTime | null;
  updatedAt: ISODateTime;
}

export type WeekStart = 0 | 1 | 6;
export type DateFormat = "MMM d, yyyy" | "d MMM yyyy" | "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
export type TimeFormat = "24h" | "12h";
export type ThemePreference = "dark" | "light" | "system";

export interface Settings {
  displayName: string;
  email: string | null;
  currency: Currency;
  timeZone: string;
  weekStartsOn: WeekStart;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  defaultHourlyRate: number | null;
  theme: ThemePreference;
}

export interface AppData {
  clients: Client[];
  projects: Project[];
  entries: TimeEntry[];
  settings: Settings;
  activeTimer: ActiveTimer | null;
}

/* ---------- Mutation inputs ---------- */

export type ClientInput = Pick<Client, "name" | "contactName" | "email" | "website" | "notes">;

export type ProjectInput = Pick<
  Project,
  | "clientId"
  | "name"
  | "description"
  | "color"
  | "status"
  | "startDate"
  | "deadline"
  | "budgetType"
  | "fixedFee"
  | "hourlyRate"
  | "estimatedHours"
  | "currency"
  | "notes"
>;

export type TimeEntryInput = Pick<
  TimeEntry,
  "projectId" | "description" | "notes" | "billable" | "startedAt" | "endedAt" | "breakSeconds" | "source"
>;

export type TimerStartInput = Pick<ActiveTimer, "projectId" | "description" | "notes" | "billable">;

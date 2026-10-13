import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  ActiveTimer,
  AppData,
  Client,
  ClientInput,
  Currency,
  DateFormat,
  Project,
  ProjectInput,
  Settings,
  TimeEntry,
  TimeEntryInput,
  ThemePreference,
  TimeFormat,
  WeekStart,
} from "@/types";
import { browserTimeZone } from "@/lib/time";
import { type DataRepository, RelationError, TimerConflictError, TimerGoneError } from "./repository";
import { defaultSettings } from "./seed";

/* ---------------- Row shapes (snake_case, as stored) ---------------- */

interface ClientRow {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectRow {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  color: string;
  status: Project["status"];
  start_date: string | null;
  deadline: string | null;
  budget_type: Project["budgetType"];
  fixed_fee: number | string | null;
  hourly_rate: number | string | null;
  estimated_hours: number | string | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface EntryRow {
  id: string;
  project_id: string;
  description: string;
  notes: string | null;
  billable: boolean;
  started_at: string;
  ended_at: string;
  break_seconds: number;
  source: TimeEntry["source"];
  created_at: string;
  updated_at: string;
}

interface TimerRow {
  id: string;
  project_id: string;
  description: string;
  notes: string | null;
  billable: boolean;
  started_at: string;
  status: ActiveTimer["status"];
  accumulated_ms: number | string;
  segment_started_at: string | null;
  paused_at: string | null;
  updated_at: string;
}

interface ProfileRow {
  display_name: string;
  currency: string;
  time_zone: string;
  week_starts_on: number;
  date_format: string;
  time_format: string;
  default_hourly_rate: number | string | null;
  theme: string;
}

const num = (v: number | string | null): number | null => (v == null ? null : Number(v));
const iso = (v: string) => new Date(v).toISOString();

const toClient = (r: ClientRow): Client => ({
  id: r.id,
  name: r.name,
  contactName: r.contact_name,
  email: r.email,
  website: r.website,
  notes: r.notes,
  archived: r.archived,
  isDemo: false,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  clientId: r.client_id,
  name: r.name,
  description: r.description,
  color: r.color,
  status: r.status,
  startDate: r.start_date,
  deadline: r.deadline,
  budgetType: r.budget_type,
  fixedFee: num(r.fixed_fee),
  hourlyRate: num(r.hourly_rate),
  estimatedHours: num(r.estimated_hours),
  currency: r.currency as Currency,
  notes: r.notes,
  isDemo: false,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const toEntry = (r: EntryRow): TimeEntry => ({
  id: r.id,
  projectId: r.project_id,
  description: r.description,
  notes: r.notes,
  billable: r.billable,
  startedAt: iso(r.started_at),
  endedAt: iso(r.ended_at),
  breakSeconds: r.break_seconds,
  source: r.source,
  isDemo: false,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const toTimer = (r: TimerRow): ActiveTimer => ({
  id: r.id,
  projectId: r.project_id,
  description: r.description,
  notes: r.notes,
  billable: r.billable,
  startedAt: iso(r.started_at),
  status: r.status,
  accumulatedMs: Number(r.accumulated_ms),
  segmentStartedAt: r.segment_started_at ? iso(r.segment_started_at) : null,
  pausedAt: r.paused_at ? iso(r.paused_at) : null,
  updatedAt: iso(r.updated_at),
});

const clientPatch = (p: Partial<ClientInput> & { archived?: boolean }) => ({
  ...(p.name !== undefined && { name: p.name }),
  ...(p.contactName !== undefined && { contact_name: p.contactName }),
  ...(p.email !== undefined && { email: p.email }),
  ...(p.website !== undefined && { website: p.website }),
  ...(p.notes !== undefined && { notes: p.notes }),
  ...(p.archived !== undefined && { archived: p.archived }),
});

const projectPatch = (p: Partial<ProjectInput>) => ({
  ...(p.clientId !== undefined && { client_id: p.clientId }),
  ...(p.name !== undefined && { name: p.name }),
  ...(p.description !== undefined && { description: p.description }),
  ...(p.color !== undefined && { color: p.color }),
  ...(p.status !== undefined && { status: p.status }),
  ...(p.startDate !== undefined && { start_date: p.startDate }),
  ...(p.deadline !== undefined && { deadline: p.deadline }),
  ...(p.budgetType !== undefined && { budget_type: p.budgetType }),
  ...(p.fixedFee !== undefined && { fixed_fee: p.fixedFee }),
  ...(p.hourlyRate !== undefined && { hourly_rate: p.hourlyRate }),
  ...(p.estimatedHours !== undefined && { estimated_hours: p.estimatedHours }),
  ...(p.currency !== undefined && { currency: p.currency }),
  ...(p.notes !== undefined && { notes: p.notes }),
});

const entryRow = (e: TimeEntryInput) => ({
  project_id: e.projectId,
  description: e.description,
  notes: e.notes,
  billable: e.billable,
  started_at: e.startedAt,
  ended_at: e.endedAt,
  break_seconds: e.breakSeconds,
  source: e.source,
});

const timerRow = (t: ActiveTimer) => ({
  project_id: t.projectId,
  description: t.description,
  notes: t.notes,
  billable: t.billable,
  started_at: t.startedAt,
  status: t.status,
  accumulated_ms: Math.round(t.accumulatedMs),
  segment_started_at: t.segmentStartedAt,
  paused_at: t.pausedAt,
});

/** FK violations: 23503 (foreign_key_violation) or 23001 (restrict_violation, from ON DELETE RESTRICT). */
const isRelationViolation = (error: PostgrestError | null) => error?.code === "23503" || error?.code === "23001";

function fail(error: PostgrestError | null, context: string): never {
  if (isRelationViolation(error)) {
    throw new RelationError("This record is still referenced by other data. Archive it instead to keep its history.");
  }
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
}

const BROADCAST = "hourbase:sync";

/**
 * Supabase-backed repository. Runs in the browser with the user's session;
 * Row Level Security guarantees each user only reads and writes their own rows.
 */
export class SupabaseRepository implements DataRepository {
  readonly mode = "supabase" as const;
  private channel: BroadcastChannel | null =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(BROADCAST) : null;

  constructor(private readonly db: SupabaseClient) {}

  private notify() {
    this.channel?.postMessage("changed");
  }

  private async userId(): Promise<string> {
    const { data, error } = await this.db.auth.getUser();
    if (error || !data.user) throw new Error("Your session has expired. Please sign in again.");
    return data.user.id;
  }

  async load(): Promise<AppData> {
    const { data: auth, error: authError } = await this.db.auth.getUser();
    if (authError || !auth.user) throw new Error("Your session has expired. Please sign in again.");
    const [clients, projects, entries, timer, profile] = await Promise.all([
      this.db.from("clients").select("*").order("name"),
      this.db.from("projects").select("*").order("created_at"),
      this.db.from("time_entries").select("*").order("started_at", { ascending: false }),
      this.db.from("active_timers").select("*").maybeSingle(),
      this.db.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
    ]);
    if (clients.error) fail(clients.error, "Loading clients failed");
    if (projects.error) fail(projects.error, "Loading projects failed");
    if (entries.error) fail(entries.error, "Loading time entries failed");
    if (timer.error) fail(timer.error, "Loading timer failed");
    if (profile.error) fail(profile.error, "Loading profile failed");

    const base = defaultSettings(browserTimeZone());
    const p = profile.data as ProfileRow | null;
    const settings: Settings = p
      ? {
          displayName: p.display_name || auth.user.email?.split("@")[0] || base.displayName,
          email: auth.user.email ?? null,
          currency: p.currency as Currency,
          timeZone: p.time_zone,
          weekStartsOn: p.week_starts_on as WeekStart,
          dateFormat: p.date_format as DateFormat,
          timeFormat: p.time_format as TimeFormat,
          defaultHourlyRate: num(p.default_hourly_rate),
          theme: p.theme as ThemePreference,
        }
      : { ...base, displayName: auth.user.email?.split("@")[0] ?? "", email: auth.user.email ?? null, defaultHourlyRate: null };

    // First sign-in: profile defaults to UTC; adopt the browser's zone once.
    if (p && p.time_zone === "UTC" && base.timeZone !== "UTC") {
      settings.timeZone = base.timeZone;
      void this.db.from("profiles").update({ time_zone: base.timeZone }).eq("id", auth.user.id);
    }

    return {
      clients: (clients.data as ClientRow[]).map(toClient),
      projects: (projects.data as ProjectRow[]).map(toProject),
      entries: (entries.data as EntryRow[]).map(toEntry),
      activeTimer: timer.data ? toTimer(timer.data as TimerRow) : null,
      settings,
    };
  }

  /* ---------------- clients ---------------- */

  async createClient(input: ClientInput): Promise<Client> {
    const { data, error } = await this.db.from("clients").insert(clientPatch(input)).select().single();
    if (error) fail(error, "Couldn't create client");
    this.notify();
    return toClient(data as ClientRow);
  }

  async updateClient(id: string, patch: Partial<ClientInput> & { archived?: boolean }): Promise<Client> {
    const { data, error } = await this.db.from("clients").update(clientPatch(patch)).eq("id", id).select().single();
    if (error) fail(error, "Couldn't update client");
    this.notify();
    return toClient(data as ClientRow);
  }

  async deleteClient(id: string): Promise<void> {
    const { error } = await this.db.from("clients").delete().eq("id", id);
    if (isRelationViolation(error)) {
      throw new RelationError("This client still has projects. Archive the client instead, or delete its projects first.");
    }
    if (error) fail(error, "Couldn't delete client");
    this.notify();
  }

  /* ---------------- projects ---------------- */

  async createProject(input: ProjectInput): Promise<Project> {
    const { data, error } = await this.db.from("projects").insert(projectPatch(input)).select().single();
    if (error) fail(error, "Couldn't create project");
    this.notify();
    return toProject(data as ProjectRow);
  }

  async updateProject(id: string, patch: Partial<ProjectInput>): Promise<Project> {
    const { data, error } = await this.db.from("projects").update(projectPatch(patch)).eq("id", id).select().single();
    if (error) fail(error, "Couldn't update project");
    this.notify();
    return toProject(data as ProjectRow);
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await this.db.from("projects").delete().eq("id", id);
    if (isRelationViolation(error)) throw new RelationError("This project has tracked time. Archive it to keep its history.");
    if (error) fail(error, "Couldn't delete project");
    this.notify();
  }

  /* ---------------- entries ---------------- */

  async createEntry(input: TimeEntryInput): Promise<TimeEntry> {
    const { data, error } = await this.db.from("time_entries").insert(entryRow(input)).select().single();
    if (error) fail(error, "Couldn't save time entry");
    this.notify();
    return toEntry(data as EntryRow);
  }

  async updateEntry(id: string, input: TimeEntryInput): Promise<TimeEntry> {
    const { data, error } = await this.db.from("time_entries").update(entryRow(input)).eq("id", id).select().maybeSingle();
    if (error) fail(error, "Couldn't update time entry");
    if (!data) throw new Error("Time entry not found. It may have been deleted elsewhere.");
    this.notify();
    return toEntry(data as EntryRow);
  }

  async deleteEntry(id: string): Promise<void> {
    const { error } = await this.db.from("time_entries").delete().eq("id", id);
    if (error) fail(error, "Couldn't delete time entry");
    this.notify();
  }

  /* ---------------- timer ---------------- */

  async getActiveTimer(): Promise<ActiveTimer | null> {
    const { data, error } = await this.db.from("active_timers").select("*").maybeSingle();
    if (error) fail(error, "Couldn't load timer");
    return data ? toTimer(data as TimerRow) : null;
  }

  async startTimer(timer: ActiveTimer): Promise<ActiveTimer> {
    await this.userId();
    const { data, error } = await this.db
      .from("active_timers")
      .insert({ id: timer.id, ...timerRow(timer) })
      .select()
      .single();
    if (error?.code === "23505") throw new TimerConflictError(await this.getActiveTimer());
    if (error) fail(error, "Couldn't start timer");
    this.notify();
    return toTimer(data as TimerRow);
  }

  async updateTimer(timer: ActiveTimer): Promise<ActiveTimer> {
    const { data, error } = await this.db.from("active_timers").update(timerRow(timer)).eq("id", timer.id).select().maybeSingle();
    if (error) fail(error, "Couldn't update timer");
    if (!data) throw new TimerGoneError();
    this.notify();
    return toTimer(data as TimerRow);
  }

  async finishTimer(timerId: string, entry: TimeEntryInput): Promise<TimeEntry> {
    const { data, error } = await this.db.rpc("finish_timer", {
      p_timer_id: timerId,
      p_project_id: entry.projectId,
      p_description: entry.description,
      p_notes: entry.notes,
      p_billable: entry.billable,
      p_started_at: entry.startedAt,
      p_ended_at: entry.endedAt,
      p_break_seconds: entry.breakSeconds,
    });
    if (error?.code === "P0002") throw new TimerGoneError();
    if (error) fail(error, "Couldn't save the session");
    this.notify();
    return toEntry(data as EntryRow);
  }

  async discardTimer(timerId: string): Promise<void> {
    const { error } = await this.db.from("active_timers").delete().eq("id", timerId);
    if (error) fail(error, "Couldn't discard timer");
    this.notify();
  }

  /* ---------------- settings ---------------- */

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const uid = await this.userId();
    const row = {
      ...(patch.displayName !== undefined && { display_name: patch.displayName }),
      ...(patch.currency !== undefined && { currency: patch.currency }),
      ...(patch.timeZone !== undefined && { time_zone: patch.timeZone }),
      ...(patch.weekStartsOn !== undefined && { week_starts_on: patch.weekStartsOn }),
      ...(patch.dateFormat !== undefined && { date_format: patch.dateFormat }),
      ...(patch.timeFormat !== undefined && { time_format: patch.timeFormat }),
      ...(patch.defaultHourlyRate !== undefined && { default_hourly_rate: patch.defaultHourlyRate }),
      ...(patch.theme !== undefined && { theme: patch.theme }),
    };
    const { error } = await this.db.from("profiles").upsert({ id: uid, ...row });
    if (error) fail(error, "Couldn't save settings");
    this.notify();
    return (await this.load()).settings;
  }

  /**
   * Same-browser tabs sync instantly via BroadcastChannel; other devices sync
   * whenever this tab regains focus or becomes visible.
   */
  subscribe(onExternalChange: () => void): () => void {
    const onMessage = () => onExternalChange();
    const onVisible = () => {
      if (document.visibilityState === "visible") onExternalChange();
    };
    this.channel?.addEventListener("message", onMessage);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      this.channel?.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }
}

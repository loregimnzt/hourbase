import type {
  ActiveTimer,
  AppData,
  Client,
  ClientInput,
  Project,
  ProjectInput,
  Settings,
  TimeEntry,
  TimeEntryInput,
} from "@/types";

export type DataMode = "demo" | "supabase";

/**
 * The one persistence contract the UI depends on. Swap implementations
 * (local demo storage ↔ Supabase) without touching pages or components.
 *
 * Timer policy (both adapters):
 *  - A user has at most ONE active timer, across all tabs and devices.
 *  - `startTimer` rejects with TimerConflictError if one already exists.
 *  - `updateTimer` / `finishTimer` reject with TimerGoneError if the timer was
 *    stopped or replaced elsewhere (another tab or device) in the meantime.
 */
export interface DataRepository {
  readonly mode: DataMode;
  load(): Promise<AppData>;

  createClient(input: ClientInput): Promise<Client>;
  updateClient(id: string, patch: Partial<ClientInput> & { archived?: boolean }): Promise<Client>;
  /** Permanently delete a client. Rejects if the client still has projects. */
  deleteClient(id: string): Promise<void>;

  createProject(input: ProjectInput): Promise<Project>;
  updateProject(id: string, patch: Partial<ProjectInput>): Promise<Project>;
  /** Permanently delete a project. Rejects if the project has time entries. */
  deleteProject(id: string): Promise<void>;

  createEntry(input: TimeEntryInput): Promise<TimeEntry>;
  updateEntry(id: string, input: TimeEntryInput): Promise<TimeEntry>;
  deleteEntry(id: string): Promise<void>;

  getActiveTimer(): Promise<ActiveTimer | null>;
  startTimer(timer: ActiveTimer): Promise<ActiveTimer>;
  updateTimer(timer: ActiveTimer): Promise<ActiveTimer>;
  /** Atomically remove the timer and save it as a time entry. */
  finishTimer(timerId: string, entry: TimeEntryInput): Promise<TimeEntry>;
  discardTimer(timerId: string): Promise<void>;

  updateSettings(patch: Partial<Settings>): Promise<Settings>;

  /** Notify when data changes outside this tab. Returns an unsubscribe fn. */
  subscribe(onExternalChange: () => void): () => void;

  /** Demo-only maintenance. */
  resetDemo?(): Promise<void>;
  clearExampleData?(): Promise<void>;
}

export class TimerConflictError extends Error {
  constructor(public readonly existing: ActiveTimer | null) {
    super("A timer is already running. Stop it before starting a new one.");
    this.name = "TimerConflictError";
  }
}

export class TimerGoneError extends Error {
  constructor() {
    super("This timer was stopped in another tab or device.");
    this.name = "TimerGoneError";
  }
}

export class RelationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RelationError";
  }
}

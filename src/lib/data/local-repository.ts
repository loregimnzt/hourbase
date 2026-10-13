import type { ActiveTimer, AppData, Client, Project, Settings, TimeEntry, TimeEntryInput } from "@/types";
import { browserTimeZone } from "@/lib/time";
import { uuid } from "@/lib/utils";
import { type DataRepository, RelationError, TimerConflictError, TimerGoneError } from "./repository";
import { buildSeed } from "./seed";

/**
 * Demo-mode persistence in localStorage.
 *
 * - All data lives under one namespaced key on THIS browser only.
 * - Every mutation re-reads storage first (read-modify-write), so a change made
 *   in another tab is never overwritten with stale in-memory state.
 * - Other tabs are notified through the native `storage` event.
 */
const STORAGE_KEY = "hourbase:demo:v1";
const SCHEMA_VERSION = 1;

interface Stored extends AppData {
  version: number;
}

function now() {
  return new Date().toISOString();
}

export class LocalRepository implements DataRepository {
  readonly mode = "demo" as const;

  private read(): Stored {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      throw new Error("Browser storage is unavailable. Demo mode needs localStorage (private browsing may block it).");
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Stored;
        if (parsed.version === SCHEMA_VERSION && Array.isArray(parsed.entries)) return parsed;
      } catch {
        /* corrupted — fall through and reseed */
      }
    }
    const seeded: Stored = { ...buildSeed(browserTimeZone()), version: SCHEMA_VERSION };
    this.write(seeded);
    return seeded;
  }

  private write(data: Stored) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw new Error("Couldn't save to browser storage (it may be full or blocked).");
    }
  }

  private mutate<T>(fn: (data: Stored) => T): T {
    const data = this.read();
    const result = fn(data);
    this.write(data);
    return result;
  }

  async load(): Promise<AppData> {
    const { version: _v, ...data } = this.read();
    void _v;
    return data;
  }

  /* ---------------- clients ---------------- */

  async createClient(input: Parameters<DataRepository["createClient"]>[0]): Promise<Client> {
    return this.mutate((d) => {
      const t = now();
      const client: Client = { id: uuid(), ...input, archived: false, isDemo: false, createdAt: t, updatedAt: t };
      d.clients.push(client);
      return client;
    });
  }

  async updateClient(id: string, patch: Parameters<DataRepository["updateClient"]>[1]): Promise<Client> {
    return this.mutate((d) => {
      const i = d.clients.findIndex((c) => c.id === id);
      if (i < 0) throw new Error("Client not found.");
      d.clients[i] = { ...d.clients[i], ...patch, updatedAt: now() };
      return d.clients[i];
    });
  }

  async deleteClient(id: string): Promise<void> {
    this.mutate((d) => {
      if (d.projects.some((p) => p.clientId === id)) {
        throw new RelationError("This client still has projects. Archive the client instead, or delete its projects first.");
      }
      d.clients = d.clients.filter((c) => c.id !== id);
    });
  }

  /* ---------------- projects ---------------- */

  async createProject(input: Parameters<DataRepository["createProject"]>[0]): Promise<Project> {
    return this.mutate((d) => {
      if (input.clientId && !d.clients.some((c) => c.id === input.clientId)) throw new Error("Client not found.");
      const t = now();
      const project: Project = { id: uuid(), ...input, isDemo: false, createdAt: t, updatedAt: t };
      d.projects.push(project);
      return project;
    });
  }

  async updateProject(id: string, patch: Parameters<DataRepository["updateProject"]>[1]): Promise<Project> {
    return this.mutate((d) => {
      const i = d.projects.findIndex((p) => p.id === id);
      if (i < 0) throw new Error("Project not found.");
      if (patch.clientId && !d.clients.some((c) => c.id === patch.clientId)) throw new Error("Client not found.");
      d.projects[i] = { ...d.projects[i], ...patch, updatedAt: now() };
      return d.projects[i];
    });
  }

  async deleteProject(id: string): Promise<void> {
    this.mutate((d) => {
      if (d.entries.some((e) => e.projectId === id)) {
        throw new RelationError("This project has tracked time. Archive it to keep its history.");
      }
      if (d.activeTimer?.projectId === id) throw new RelationError("Stop the running timer for this project first.");
      d.projects = d.projects.filter((p) => p.id !== id);
    });
  }

  /* ---------------- entries ---------------- */

  private assertProject(d: Stored, projectId: string) {
    if (!d.projects.some((p) => p.id === projectId)) throw new Error("Project not found.");
  }

  async createEntry(input: TimeEntryInput): Promise<TimeEntry> {
    return this.mutate((d) => {
      this.assertProject(d, input.projectId);
      const t = now();
      const entry: TimeEntry = { id: uuid(), ...input, isDemo: false, createdAt: t, updatedAt: t };
      d.entries.unshift(entry);
      return entry;
    });
  }

  async updateEntry(id: string, input: TimeEntryInput): Promise<TimeEntry> {
    return this.mutate((d) => {
      this.assertProject(d, input.projectId);
      const i = d.entries.findIndex((e) => e.id === id);
      if (i < 0) throw new Error("Time entry not found. It may have been deleted in another tab.");
      d.entries[i] = { ...d.entries[i], ...input, updatedAt: now() };
      return d.entries[i];
    });
  }

  async deleteEntry(id: string): Promise<void> {
    this.mutate((d) => {
      d.entries = d.entries.filter((e) => e.id !== id);
    });
  }

  /* ---------------- timer ---------------- */

  async getActiveTimer(): Promise<ActiveTimer | null> {
    return this.read().activeTimer;
  }

  async startTimer(timer: ActiveTimer): Promise<ActiveTimer> {
    return this.mutate((d) => {
      if (d.activeTimer) throw new TimerConflictError(d.activeTimer);
      this.assertProject(d, timer.projectId);
      d.activeTimer = timer;
      return timer;
    });
  }

  async updateTimer(timer: ActiveTimer): Promise<ActiveTimer> {
    return this.mutate((d) => {
      if (!d.activeTimer || d.activeTimer.id !== timer.id) throw new TimerGoneError();
      this.assertProject(d, timer.projectId);
      d.activeTimer = timer;
      return timer;
    });
  }

  async finishTimer(timerId: string, input: TimeEntryInput): Promise<TimeEntry> {
    return this.mutate((d) => {
      if (!d.activeTimer || d.activeTimer.id !== timerId) throw new TimerGoneError();
      this.assertProject(d, input.projectId);
      const t = now();
      const entry: TimeEntry = { id: uuid(), ...input, isDemo: false, createdAt: t, updatedAt: t };
      d.entries.unshift(entry);
      d.activeTimer = null;
      return entry;
    });
  }

  async discardTimer(timerId: string): Promise<void> {
    this.mutate((d) => {
      if (d.activeTimer?.id === timerId) d.activeTimer = null;
    });
  }

  /* ---------------- settings ---------------- */

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    return this.mutate((d) => {
      d.settings = { ...d.settings, ...patch };
      return d.settings;
    });
  }

  subscribe(onExternalChange: () => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) onExternalChange();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  async resetDemo(): Promise<void> {
    const current = this.read();
    const seeded: Stored = { ...buildSeed(current.settings.timeZone || browserTimeZone()), version: SCHEMA_VERSION };
    this.write(seeded);
  }

  /** Remove example records but keep everything the user created. */
  async clearExampleData(): Promise<void> {
    this.mutate((d) => {
      const demoProjects = new Set(d.projects.filter((p) => p.isDemo).map((p) => p.id));
      // Keep demo projects/clients that the user's own records still reference.
      const userEntries = d.entries.filter((e) => !e.isDemo);
      const neededProjects = new Set(userEntries.map((e) => e.projectId));
      if (d.activeTimer) neededProjects.add(d.activeTimer.projectId);
      d.entries = userEntries;
      d.projects = d.projects.filter((p) => !demoProjects.has(p.id) || neededProjects.has(p.id));
      const neededClients = new Set(d.projects.map((p) => p.clientId).filter(Boolean));
      d.clients = d.clients.filter((c) => !c.isDemo || neededClients.has(c.id));
    });
  }
}

"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  TimerStartInput,
} from "@/types";
import { type DataMode, type DataRepository, TimerConflictError, TimerGoneError } from "@/lib/data/repository";
import { LocalRepository } from "@/lib/data/local-repository";
import { SupabaseRepository } from "@/lib/data/supabase-repository";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createTimer, pauseTimer, resumeTimer, timerToEntry } from "@/lib/timer";
import { uuid } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

type Status = "loading" | "ready" | "error";

interface DataContextValue {
  mode: DataMode;
  status: Status;
  error: string | null;
  data: AppData;
  reload: () => Promise<void>;

  createClient: (input: ClientInput) => Promise<Client>;
  updateClient: (id: string, patch: Partial<ClientInput> & { archived?: boolean }) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;

  createProject: (input: ProjectInput) => Promise<Project>;
  updateProject: (id: string, patch: Partial<ProjectInput>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  createEntry: (input: TimeEntryInput) => Promise<TimeEntry>;
  updateEntry: (id: string, input: TimeEntryInput) => Promise<TimeEntry>;
  deleteEntry: (id: string) => Promise<void>;

  startTimer: (input: TimerStartInput) => Promise<ActiveTimer>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  updateTimerDetails: (patch: Partial<TimerStartInput>) => Promise<void>;
  stopTimer: () => Promise<TimeEntry | null>;
  discardTimer: () => Promise<void>;

  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;
  resetDemo: () => Promise<void>;
  clearExampleData: () => Promise<void>;
}

const EMPTY: AppData = {
  clients: [],
  projects: [],
  entries: [],
  activeTimer: null,
  settings: {
    displayName: "",
    email: null,
    currency: "USD",
    timeZone: "UTC",
    weekStartsOn: 1,
    dateFormat: "MMM d, yyyy",
    timeFormat: "24h",
    defaultHourlyRate: null,
    theme: "dark",
  },
};

const DataContext = createContext<DataContextValue | null>(null);

function createRepository(): DataRepository {
  return isSupabaseConfigured ? new SupabaseRepository(getSupabaseBrowserClient()) : new LocalRepository();
}

const byStartDesc = (a: TimeEntry, b: TimeEntry) => b.startedAt.localeCompare(a.startedAt);

export function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const repoRef = useRef<DataRepository | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(EMPTY);
  // Latest data for async callbacks without re-creating them.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const repo = useCallback(() => {
    repoRef.current ??= createRepository();
    return repoRef.current;
  }, []);

  const reload = useCallback(async () => {
    try {
      const next = await repo().load();
      setData({ ...next, entries: [...next.entries].sort(byStartDesc) });
      setError(null);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your data.");
      setStatus("error");
    }
  }, [repo]);

  useEffect(() => {
    void reload();
    return repo().subscribe(() => void reload());
  }, [reload, repo]);

  const patch = (fn: (d: AppData) => AppData) =>
    setData((d) => {
      const next = fn(d);
      dataRef.current = next;
      return next;
    });

  /* ---------------- clients ---------------- */
  const createClient = useCallback(async (input: ClientInput) => {
    const c = await repo().createClient(input);
    patch((d) => ({ ...d, clients: [...d.clients, c] }));
    return c;
  }, [repo]);
  const updateClient = useCallback(async (id: string, p: Partial<ClientInput> & { archived?: boolean }) => {
    const c = await repo().updateClient(id, p);
    patch((d) => ({ ...d, clients: d.clients.map((x) => (x.id === id ? c : x)) }));
    return c;
  }, [repo]);
  const deleteClient = useCallback(async (id: string) => {
    await repo().deleteClient(id);
    patch((d) => ({ ...d, clients: d.clients.filter((x) => x.id !== id) }));
  }, [repo]);

  /* ---------------- projects ---------------- */
  const createProject = useCallback(async (input: ProjectInput) => {
    const p = await repo().createProject(input);
    patch((d) => ({ ...d, projects: [...d.projects, p] }));
    return p;
  }, [repo]);
  const updateProject = useCallback(async (id: string, p: Partial<ProjectInput>) => {
    const next = await repo().updateProject(id, p);
    patch((d) => ({ ...d, projects: d.projects.map((x) => (x.id === id ? next : x)) }));
    return next;
  }, [repo]);
  const deleteProject = useCallback(async (id: string) => {
    await repo().deleteProject(id);
    patch((d) => ({ ...d, projects: d.projects.filter((x) => x.id !== id) }));
  }, [repo]);

  /* ---------------- entries ---------------- */
  const createEntry = useCallback(async (input: TimeEntryInput) => {
    const e = await repo().createEntry(input);
    patch((d) => ({ ...d, entries: [e, ...d.entries].sort(byStartDesc) }));
    return e;
  }, [repo]);
  const updateEntry = useCallback(async (id: string, input: TimeEntryInput) => {
    const e = await repo().updateEntry(id, input);
    patch((d) => ({ ...d, entries: d.entries.map((x) => (x.id === id ? e : x)).sort(byStartDesc) }));
    return e;
  }, [repo]);
  const deleteEntry = useCallback(async (id: string) => {
    await repo().deleteEntry(id);
    patch((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== id) }));
  }, [repo]);

  /* ---------------- timer ---------------- */

  /** Run a timer mutation; if another tab/device changed it first, resync and explain. */
  const guardTimer = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        if (e instanceof TimerGoneError) {
          await reload();
          toast.info("Timer changed elsewhere", "It was stopped or replaced in another tab or device. Your view is now up to date.");
        } else if (e instanceof TimerConflictError) {
          await reload();
          toast.error("A timer is already running", "Only one timer can run at a time. Stop the current one first.");
        }
        throw e;
      }
    },
    [reload, toast],
  );

  const startTimer = useCallback(
    (input: TimerStartInput) =>
      guardTimer(async () => {
        const t = await repo().startTimer(createTimer(input, new Date(), uuid()));
        patch((d) => ({ ...d, activeTimer: t }));
        return t;
      }),
    [guardTimer, repo],
  );

  const mutateTimer = useCallback(
    (fn: (t: ActiveTimer) => ActiveTimer) =>
      guardTimer(async () => {
        const current = dataRef.current.activeTimer;
        if (!current) throw new TimerGoneError();
        const t = await repo().updateTimer(fn(current));
        patch((d) => ({ ...d, activeTimer: t }));
      }),
    [guardTimer, repo],
  );

  const pause = useCallback(() => mutateTimer((t) => pauseTimer(t, new Date())), [mutateTimer]);
  const resume = useCallback(() => mutateTimer((t) => resumeTimer(t, new Date())), [mutateTimer]);
  const updateTimerDetails = useCallback(
    (p: Partial<TimerStartInput>) => mutateTimer((t) => ({ ...t, ...p, updatedAt: new Date().toISOString() })),
    [mutateTimer],
  );

  const stopTimer = useCallback(
    () =>
      guardTimer(async () => {
        const current = dataRef.current.activeTimer;
        if (!current) return null;
        const entry = await repo().finishTimer(current.id, timerToEntry(current, new Date()));
        patch((d) => ({ ...d, activeTimer: null, entries: [entry, ...d.entries].sort(byStartDesc) }));
        return entry;
      }),
    [guardTimer, repo],
  );

  const discardTimer = useCallback(async () => {
    const current = dataRef.current.activeTimer;
    if (!current) return;
    await repo().discardTimer(current.id);
    patch((d) => ({ ...d, activeTimer: null }));
  }, [repo]);

  /* ---------------- settings & demo ---------------- */
  const updateSettings = useCallback(async (p: Partial<Settings>) => {
    const s = await repo().updateSettings(p);
    patch((d) => ({ ...d, settings: s }));
    return s;
  }, [repo]);

  const resetDemo = useCallback(async () => {
    await repo().resetDemo?.();
    await reload();
  }, [repo, reload]);

  const clearExampleData = useCallback(async () => {
    await repo().clearExampleData?.();
    await reload();
  }, [repo, reload]);

  const value = useMemo<DataContextValue>(
    () => ({
      mode: isSupabaseConfigured ? "supabase" : "demo",
      status,
      error,
      data,
      reload,
      createClient,
      updateClient,
      deleteClient,
      createProject,
      updateProject,
      deleteProject,
      createEntry,
      updateEntry,
      deleteEntry,
      startTimer,
      pauseTimer: pause,
      resumeTimer: resume,
      updateTimerDetails,
      stopTimer,
      discardTimer,
      updateSettings,
      resetDemo,
      clearExampleData,
    }),
    [status, error, data, reload, createClient, updateClient, deleteClient, createProject, updateProject, deleteProject, createEntry, updateEntry, deleteEntry, startTimer, pause, resume, updateTimerDetails, stopTimer, discardTimer, updateSettings, resetDemo, clearExampleData],
  );

  return <DataContext value={value}>{children}</DataContext>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

export function useSettings(): Settings {
  return useData().data.settings;
}

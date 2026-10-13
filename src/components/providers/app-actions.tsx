"use client";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { Client, Project, TimeEntry } from "@/types";
import { ClientModal } from "@/components/clients/client-modal";
import { type EntryDefaults, EntryModal } from "@/components/entries/entry-modal";
import { ProjectModal } from "@/components/projects/project-modal";

interface AppActions {
  openNewEntry: (defaults?: EntryDefaults) => void;
  openEditEntry: (entry: TimeEntry) => void;
  openProject: (project?: Project | null, opts?: { clientId?: string }) => void;
  openClient: (client?: Client | null) => void;
}

const Ctx = createContext<AppActions | null>(null);

type ModalState =
  | { kind: "none" }
  | { kind: "entry"; entry: TimeEntry | null; defaults?: EntryDefaults }
  | { kind: "project"; project: Project | null; clientId?: string }
  | { kind: "client"; client: Client | null };

/** App-wide create/edit dialogs, reachable from any page or quick action. */
export function AppActionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ kind: "none" });
  const close = useCallback(() => setState({ kind: "none" }), []);

  const api = useMemo<AppActions>(
    () => ({
      openNewEntry: (defaults) => setState({ kind: "entry", entry: null, defaults }),
      openEditEntry: (entry) => setState({ kind: "entry", entry }),
      openProject: (project, opts) => setState({ kind: "project", project: project ?? null, clientId: opts?.clientId }),
      openClient: (client) => setState({ kind: "client", client: client ?? null }),
    }),
    [],
  );

  return (
    <Ctx value={api}>
      {children}
      {/* Mounted only while open, so forms always start from fresh values. */}
      {state.kind === "entry" && <EntryModal open onClose={close} entry={state.entry} defaults={state.defaults} />}
      {state.kind === "project" && <ProjectModal open onClose={close} project={state.project} defaultClientId={state.clientId} />}
      {state.kind === "client" && <ClientModal open onClose={close} client={state.client} />}
    </Ctx>
  );
}

export function useAppActions(): AppActions {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppActions must be used inside AppActionsProvider");
  return ctx;
}

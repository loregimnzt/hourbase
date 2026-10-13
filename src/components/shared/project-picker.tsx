"use client";
import { useMemo } from "react";
import type { Client, Project } from "@/types";
import { Field, Select } from "@/components/ui/field";

interface ProjectPickerProps {
  clients: Client[];
  projects: Project[];
  clientId: string;
  projectId: string;
  onClientChange: (id: string) => void;
  onProjectChange: (id: string, clientId: string) => void;
  projectError?: string;
  /** Always include this project even if archived/completed (when editing). */
  includeProjectId?: string;
  disabled?: boolean;
}

/**
 * Client → project selection. Choosing a client narrows the project list;
 * choosing a project sets its client automatically. Only active projects are
 * offered for new time, unless editing an entry that already belongs to one.
 */
export function ProjectPicker({ clients, projects, clientId, projectId, onClientChange, onProjectChange, projectError, includeProjectId, disabled }: ProjectPickerProps) {
  const selectable = useMemo(
    () => projects.filter((p) => p.status === "active" || p.id === includeProjectId),
    [projects, includeProjectId],
  );
  const clientOptions = useMemo(() => {
    const used = new Set(selectable.map((p) => p.clientId));
    return clients.filter((c) => used.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, selectable]);
  const hasInternal = selectable.some((p) => !p.clientId);

  const visible = selectable.filter((p) => !clientId || (clientId === "__internal" ? !p.clientId : p.clientId === clientId));
  const groups = useMemo(() => {
    const names = new Map(clients.map((c) => [c.id, c.name]));
    const map = new Map<string, Project[]>();
    for (const p of visible) {
      const key = p.clientId ? names.get(p.clientId) ?? "Unknown client" : "Internal";
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible, clients]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Client">
        {(a) => (
          <Select {...a} value={clientId} disabled={disabled} onChange={(e) => onClientChange(e.target.value)}>
            <option value="">All clients</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            {hasInternal && <option value="__internal">Internal (no client)</option>}
          </Select>
        )}
      </Field>
      <Field label="Project" error={projectError}>
        {(a) => (
          <Select
            {...a}
            value={projectId}
            disabled={disabled}
            onChange={(e) => {
              const p = projects.find((x) => x.id === e.target.value);
              onProjectChange(e.target.value, p ? p.clientId ?? "__internal" : clientId);
            }}
          >
            <option value="">{visible.length ? "Choose a project…" : "No active projects"}</option>
            {groups.map(([label, list]) => (
              <optgroup key={label} label={label}>
                {list.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.status !== "active" ? ` (${p.status})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}

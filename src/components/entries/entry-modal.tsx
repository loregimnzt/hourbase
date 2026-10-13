"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Moon, Trash } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import type { TimeEntry, TimeEntryInput } from "@/types";
import { useData } from "@/components/providers/data-provider";
import { ProjectPicker } from "@/components/shared/project-picker";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { entryToManualTimes, formatDuration, formatTime, resolveManualTimes, todayISO } from "@/lib/time";
import { errorMessage, nullable } from "@/lib/utils";
import { type ManualEntryFormValues, manualEntrySchema } from "@/lib/validation";

export interface EntryDefaults {
  projectId?: string;
  date?: string;
}

interface EntryModalProps {
  open: boolean;
  onClose: () => void;
  entry?: TimeEntry | null;
  defaults?: EntryDefaults;
}

export function EntryModal({ open, onClose, entry, defaults }: EntryModalProps) {
  const { data, createEntry, updateEntry, deleteEntry } = useData();
  const { clients, projects, settings } = data;
  const toast = useToast();
  const confirm = useConfirm();
  const editing = Boolean(entry);

  const initial = useMemo<ManualEntryFormValues>(() => {
    const tz = settings.timeZone;
    if (entry) {
      const t = entryToManualTimes(entry, tz);
      const p = projects.find((x) => x.id === entry.projectId);
      return {
        clientId: p ? p.clientId ?? "__internal" : "",
        projectId: entry.projectId,
        description: entry.description,
        date: t.date,
        startTime: t.startTime,
        endTime: t.endTime,
        breakMinutes: t.breakMinutes ? String(t.breakMinutes) : "",
        billable: entry.billable,
        notes: entry.notes ?? "",
      };
    }
    const p = projects.find((x) => x.id === defaults?.projectId);
    return {
      clientId: p ? p.clientId ?? "__internal" : "",
      projectId: p?.id ?? "",
      description: "",
      date: defaults?.date ?? todayISO(tz),
      startTime: "09:00",
      endTime: "10:00",
      breakMinutes: "",
      billable: p ? !(p.budgetType === "hourly" && !p.hourlyRate && !settings.defaultHourlyRate) : true,
      notes: "",
    };
  }, [entry, defaults, projects, settings]);

  const form = useForm<ManualEntryFormValues>({ resolver: zodResolver(manualEntrySchema), defaultValues: initial });
  const { register, handleSubmit, control, setValue, setError, reset, formState } = form;

  useEffect(() => {
    if (open) reset(initial);
  }, [open, initial, reset]);

  const [date, startTime, endTime, breakMinutes, clientId, projectId] = useWatch({
    control,
    name: ["date", "startTime", "endTime", "breakMinutes", "clientId", "projectId"],
  });
  const preview = resolveManualTimes({ date, startTime, endTime, breakMinutes: Number(breakMinutes || 0) }, settings.timeZone);
  // Overlaps are allowed (e.g. parallel billing) but flagged so they're intentional.
  const overlap = preview.ok
    ? data.entries.find((e) => e.id !== entry?.id && e.startedAt < preview.endedAt && e.endedAt > preview.startedAt)
    : undefined;

  const onSubmit = handleSubmit(async (v) => {
    const times = resolveManualTimes({ date: v.date, startTime: v.startTime, endTime: v.endTime, breakMinutes: Number(v.breakMinutes || 0) }, settings.timeZone);
    if (!times.ok) {
      setError(times.error.toLowerCase().includes("break") ? "breakMinutes" : "endTime", { message: times.error });
      return;
    }
    // Keep second-level precision of timer entries unless the times were edited.
    const timesEdited = ["date", "startTime", "endTime", "breakMinutes"].some((k) => formState.dirtyFields[k as keyof ManualEntryFormValues]);
    const input: TimeEntryInput = {
      projectId: v.projectId,
      description: v.description.trim(),
      notes: nullable(v.notes),
      billable: v.billable,
      startedAt: entry && !timesEdited ? entry.startedAt : times.startedAt,
      endedAt: entry && !timesEdited ? entry.endedAt : times.endedAt,
      breakSeconds: entry && !timesEdited ? entry.breakSeconds : times.breakSeconds,
      source: entry?.source ?? "manual",
    };
    try {
      if (entry) {
        await updateEntry(entry.id, input);
        toast.success("Entry updated");
      } else {
        await createEntry(input);
        toast.success("Time entry added", formatDuration(times.durationSeconds));
      }
      onClose();
    } catch (e) {
      toast.error("Couldn't save entry", errorMessage(e));
    }
  });

  const onDelete = async () => {
    if (!entry) return;
    const ok = await confirm({ title: "Delete this time entry?", description: "This permanently removes the entry and updates all totals and reports. This can't be undone.", confirmLabel: "Delete entry" });
    if (!ok) return;
    try {
      await deleteEntry(entry.id);
      toast.success("Entry deleted");
      onClose();
    } catch (e) {
      toast.error("Couldn't delete entry", errorMessage(e));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit time entry" : "Add time entry"}
      description={editing ? undefined : "Log time you worked without the timer."}
      footer={
        <>
          {editing && (
            <Button variant="ghost" className="mr-auto text-danger hover:text-danger" icon={<Trash className="size-4" aria-hidden />} onClick={onDelete}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="entry-form" loading={formState.isSubmitting}>
            {editing ? "Save changes" : "Add entry"}
          </Button>
        </>
      }
    >
      <form id="entry-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <ProjectPicker
          clients={clients}
          projects={projects}
          clientId={clientId}
          projectId={projectId}
          includeProjectId={entry?.projectId}
          projectError={formState.errors.projectId?.message}
          onClientChange={(id) => {
            setValue("clientId", id);
            const p = projects.find((x) => x.id === projectId);
            if (p && id && (id === "__internal" ? p.clientId : p.clientId !== id)) setValue("projectId", "");
          }}
          onProjectChange={(id, cid) => {
            setValue("projectId", id, { shouldValidate: formState.isSubmitted, shouldDirty: true });
            setValue("clientId", cid);
          }}
        />

        <Field label="Description" error={formState.errors.description?.message}>
          {(a) => <Input {...a} {...register("description")} placeholder="What did you work on?" autoComplete="off" />}
        </Field>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Date" error={formState.errors.date?.message} className="col-span-2 sm:col-span-1">
            {(a) => <Input {...a} type="date" {...register("date")} />}
          </Field>
          <Field label="Start" error={formState.errors.startTime?.message}>
            {(a) => <Input {...a} type="time" {...register("startTime")} />}
          </Field>
          <Field label="End" error={formState.errors.endTime?.message}>
            {(a) => <Input {...a} type="time" {...register("endTime")} />}
          </Field>
          <Field label="Break (min)" error={formState.errors.breakMinutes?.message} className="col-span-2 sm:col-span-1">
            {(a) => <Input {...a} inputMode="numeric" placeholder="0" {...register("breakMinutes")} />}
          </Field>
        </div>

        <div aria-live="polite" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-bg/40 px-4 py-3 text-sm">
          {preview.ok ? (
            <>
              <span className="text-muted">
                Duration <span className="tabular ml-1 font-semibold text-fg">{formatDuration(preview.durationSeconds)}</span>
              </span>
              {preview.breakSeconds > 0 && <span className="text-subtle">after {formatDuration(preview.breakSeconds)} break</span>}
              {preview.overnight && (
                <span className="inline-flex items-center gap-1.5 text-accent-text">
                  <Moon className="size-3.5" aria-hidden /> Ends the next day
                </span>
              )}
            </>
          ) : (
            <span className="text-danger">{preview.error}</span>
          )}
          {overlap && (
            <span className="basis-full text-[13px] text-warning">
              Overlaps “{overlap.description || "Untitled"}” ({formatTime(overlap.startedAt, settings)}–{formatTime(overlap.endedAt, settings)}). You can still save it.
            </span>
          )}
        </div>

        <Controller
          control={control}
          name="billable"
          render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Billable" description="Billable time earns revenue on hourly projects." />}
        />

        <Field label="Notes" optional error={formState.errors.notes?.message}>
          {(a) => <Textarea {...a} rows={3} {...register("notes")} placeholder="Context for future you or the invoice" />}
        </Field>
      </form>
    </Modal>
  );
}

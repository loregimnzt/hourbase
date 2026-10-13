"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CURRENCIES, type Project, type ProjectInput } from "@/types";
import { useData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { PROJECT_COLORS, nextProjectColor } from "@/lib/colors";
import { cn, errorMessage, nullable } from "@/lib/utils";
import { type ProjectFormValues, projectSchema, toNumberOrNull } from "@/lib/validation";
import { todayISO } from "@/lib/time";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  defaultClientId?: string;
  onSaved?: (p: Project) => void;
}

export function ProjectModal({ open, onClose, project, defaultClientId, onSaved }: ProjectModalProps) {
  const { data, createProject, updateProject } = useData();
  const { clients, projects, settings } = data;
  const toast = useToast();

  const initial = useMemo<ProjectFormValues>(
    () => ({
      name: project?.name ?? "",
      clientId: project ? project.clientId ?? "" : defaultClientId ?? "",
      description: project?.description ?? "",
      color: project?.color ?? nextProjectColor(projects.map((p) => p.color)),
      status: project?.status ?? "active",
      startDate: project ? project.startDate ?? "" : todayISO(settings.timeZone),
      deadline: project?.deadline ?? "",
      budgetType: project?.budgetType ?? "hourly",
      fixedFee: project?.fixedFee != null ? String(project.fixedFee) : "",
      hourlyRate: project?.hourlyRate != null ? String(project.hourlyRate) : "",
      estimatedHours: project?.estimatedHours != null ? String(project.estimatedHours) : "",
      currency: project?.currency ?? settings.currency,
      notes: project?.notes ?? "",
    }),
    [project, defaultClientId, projects, settings],
  );

  const { register, handleSubmit, control, reset, formState } = useForm<ProjectFormValues>({ resolver: zodResolver(projectSchema), defaultValues: initial });
  useEffect(() => {
    if (open) reset(initial);
  }, [open, initial, reset]);

  const budgetType = useWatch({ control, name: "budgetType" });
  const [fee, hours, rate, currency] = useWatch({ control, name: ["fixedFee", "estimatedHours", "hourlyRate", "currency"] });
  const targetRate = budgetType === "fixed" && Number(fee) > 0 && Number(hours) > 0 ? Number(fee) / Number(hours) : null;
  const estRevenue = budgetType === "hourly" && Number(hours) > 0 ? Number(hours) * (Number(rate) || settings.defaultHourlyRate || 0) : null;

  const activeClients = clients.filter((c) => !c.archived || c.id === project?.clientId).sort((a, b) => a.name.localeCompare(b.name));

  const onSubmit = handleSubmit(async (v) => {
    const input: ProjectInput = {
      name: v.name.trim(),
      clientId: v.clientId || null,
      description: nullable(v.description),
      color: v.color,
      status: v.status,
      startDate: v.startDate || null,
      deadline: v.deadline || null,
      budgetType: v.budgetType,
      fixedFee: v.budgetType === "fixed" ? toNumberOrNull(v.fixedFee) : null,
      hourlyRate: v.budgetType === "hourly" ? toNumberOrNull(v.hourlyRate) : null,
      estimatedHours: toNumberOrNull(v.estimatedHours),
      currency: v.currency,
      notes: nullable(v.notes),
    };
    try {
      const saved = project ? await updateProject(project.id, input) : await createProject(input);
      toast.success(project ? "Project updated" : "Project created", saved.name);
      onSaved?.(saved);
      onClose();
    } catch (e) {
      toast.error("Couldn't save project", errorMessage(e));
    }
  });

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={project ? "Edit project" : "New project"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="project-form" loading={formState.isSubmitting}>
            {project ? "Save changes" : "Create project"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project name" error={formState.errors.name?.message}>
            {(a) => <Input {...a} {...register("name")} placeholder="e.g. Website redesign" autoComplete="off" />}
          </Field>
          <Field label="Client" hint={!clients.length ? "No clients yet — leave as internal or add one from Clients." : undefined}>
            {(a) => (
              <Select {...a} {...register("clientId")}>
                <option value="">Internal (no client)</option>
                {activeClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-muted">Color</legend>
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <div className="flex flex-wrap items-center gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    aria-pressed={field.value.toLowerCase() === c.toLowerCase()}
                    onClick={() => field.onChange(c)}
                    className={cn("flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition", field.value.toLowerCase() === c.toLowerCase() && "ring-2 ring-fg")}
                    style={{ backgroundColor: c }}
                  >
                    {field.value.toLowerCase() === c.toLowerCase() && <Check className="size-4 text-white" aria-hidden />}
                  </button>
                ))}
                <label className="ml-1 inline-flex items-center gap-2 text-xs text-subtle">
                  Custom
                  <input type="color" value={field.value} onChange={(e) => field.onChange(e.target.value)} className="size-8 cursor-pointer rounded-lg border border-line-strong bg-transparent" />
                </label>
              </div>
            )}
          />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            {(a) => (
              <Select {...a} {...register("status")}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>
            )}
          </Field>
          <Field label="Start date" optional error={formState.errors.startDate?.message}>
            {(a) => <Input {...a} type="date" {...register("startDate")} />}
          </Field>
          <Field label="Deadline" optional error={formState.errors.deadline?.message}>
            {(a) => <Input {...a} type="date" {...register("deadline")} />}
          </Field>
        </div>

        <div className="rounded-2xl border border-line bg-bg/40 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">Budget</p>
            <Controller
              control={control}
              name="budgetType"
              render={({ field }) => (
                <Segmented
                  label="Budget type"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "hourly", label: "Hourly" },
                    { value: "fixed", label: "Fixed price" },
                  ]}
                />
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {budgetType === "fixed" ? (
              <Field label="Agreed fee" error={formState.errors.fixedFee?.message}>
                {(a) => <Input {...a} inputMode="decimal" placeholder="5000" {...register("fixedFee")} />}
              </Field>
            ) : (
              <Field label="Hourly rate" optional hint={settings.defaultHourlyRate ? `Defaults to ${fmt(settings.defaultHourlyRate)}` : "Set a default in Settings"} error={formState.errors.hourlyRate?.message}>
                {(a) => <Input {...a} inputMode="decimal" placeholder={settings.defaultHourlyRate ? String(settings.defaultHourlyRate) : "80"} {...register("hourlyRate")} />}
              </Field>
            )}
            <Field label="Estimated hours" optional error={formState.errors.estimatedHours?.message}>
              {(a) => <Input {...a} inputMode="decimal" placeholder="40" {...register("estimatedHours")} />}
            </Field>
            <Field label="Currency">
              {(a) => (
                <Select {...a} {...register("currency")}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          {(targetRate != null || estRevenue != null) && (
            <p className="mt-3 text-[13px] text-muted">
              {targetRate != null && (
                <>
                  Target effective rate: <span className="tabular font-medium text-fg">{fmt(targetRate)}/h</span> if delivered in the estimated hours.
                </>
              )}
              {estRevenue != null && estRevenue > 0 && (
                <>
                  Estimated revenue: <span className="tabular font-medium text-fg">{fmt(estRevenue)}</span> at the estimated hours.
                </>
              )}
            </p>
          )}
        </div>

        <Field label="Description" optional error={formState.errors.description?.message}>
          {(a) => <Textarea {...a} rows={2} {...register("description")} />}
        </Field>
        <Field label="Notes" optional error={formState.errors.notes?.message}>
          {(a) => <Textarea {...a} rows={2} {...register("notes")} placeholder="Scope, payment terms, links…" />}
        </Field>
      </form>
    </Modal>
  );
}

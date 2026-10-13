"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderPlus, Play } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useAppActions } from "@/components/providers/app-actions";
import { useData } from "@/components/providers/data-provider";
import { ProjectPicker } from "@/components/shared/project-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { formatClock } from "@/lib/timer";
import { errorMessage, nullable } from "@/lib/utils";
import { type TimerFormValues, timerSchema } from "@/lib/validation";

const LAST_PROJECT_KEY = "hourbase:last-project";

function lastProject(): string {
  try {
    return localStorage.getItem(LAST_PROJECT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function TimerStartForm() {
  const { data, startTimer } = useData();
  const { openProject } = useAppActions();
  const toast = useToast();
  const active = data.projects.filter((p) => p.status === "active");
  const remembered = active.find((p) => p.id === lastProject());

  const { register, handleSubmit, control, setValue, formState } = useForm<TimerFormValues>({
    resolver: zodResolver(timerSchema),
    defaultValues: {
      clientId: remembered ? remembered.clientId ?? "__internal" : "",
      projectId: remembered?.id ?? "",
      description: "",
      billable: true,
      notes: "",
    },
  });
  const [clientId, projectId] = useWatch({ control, name: ["clientId", "projectId"] });

  const onSubmit = handleSubmit(async (v) => {
    try {
      await startTimer({ projectId: v.projectId, description: v.description.trim(), notes: nullable(v.notes), billable: v.billable });
      try {
        localStorage.setItem(LAST_PROJECT_KEY, v.projectId);
      } catch {
        /* non-essential */
      }
      toast.success("Timer started");
    } catch (e) {
      if (!(e instanceof Error && e.name.startsWith("Timer"))) toast.error("Couldn't start timer", errorMessage(e));
    }
  });

  if (!active.length) {
    return (
      <section className="rounded-2xl border border-line bg-surface shadow-card">
        <EmptyState
          icon={<FolderPlus className="size-5" aria-hidden />}
          title="You need an active project to track time"
          description="Create a project (with or without a client), then start the timer."
          action={
            <Button onClick={() => openProject()} icon={<FolderPlus className="size-4" aria-hidden />}>
              New project
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Start a timer" className="rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <Field label="What are you working on?" className="flex-1" error={formState.errors.description?.message}>
            {(a) => <Input {...a} {...register("description")} placeholder="e.g. Homepage wireframes" autoComplete="off" className="h-12 text-[15px]" />}
          </Field>
          <div className="flex items-center gap-4">
            <span className="tabular font-mono text-3xl font-semibold text-subtle" aria-hidden>
              {formatClock(0)}
            </span>
            <Button type="submit" size="lg" loading={formState.isSubmitting} icon={<Play className="size-4.5 fill-current" aria-hidden />} className="min-w-32">
              Start
            </Button>
          </div>
        </div>
        <ProjectPicker
          clients={data.clients}
          projects={data.projects}
          clientId={clientId}
          projectId={projectId}
          projectError={formState.errors.projectId?.message}
          onClientChange={(id) => {
            setValue("clientId", id);
            const p = data.projects.find((x) => x.id === projectId);
            if (p && id && (id === "__internal" ? p.clientId : p.clientId !== id)) setValue("projectId", "");
          }}
          onProjectChange={(id, cid) => {
            setValue("projectId", id, { shouldValidate: formState.isSubmitted });
            setValue("clientId", cid);
          }}
        />
        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-start md:gap-8">
          <div className="md:pt-7">
            <Controller control={control} name="billable" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Billable" />} />
          </div>
          <Field label="Notes" optional>
            {(a) => <Textarea {...a} rows={1} className="min-h-10" {...register("notes")} />}
          </Field>
        </div>
      </div>
    </form>
  );
}

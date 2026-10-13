"use client";
import { withData } from "@/components/layout/with-data";
import { zodResolver } from "@hookform/resolvers/zod";
import { Database, HardDrive, KeyRound, RotateCcw, Trash } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { CURRENCIES, type DateFormat, type ThemePreference, type TimeFormat, type WeekStart } from "@/types";
import { useData } from "@/components/providers/data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatInZone, listTimeZones, timePattern } from "@/lib/time";
import { errorMessage } from "@/lib/utils";
import { type SettingsFormValues, settingsSchema, toNumberOrNull } from "@/lib/validation";

const DATE_FORMATS: DateFormat[] = ["MMM d, yyyy", "d MMM yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"];

function SettingsPage() {
  const { data, mode, updateSettings, resetDemo, clearExampleData } = useData();
  const { settings } = data;
  const toast = useToast();
  const confirm = useConfirm();
  const zones = useMemo(() => {
    const all = listTimeZones();
    return all.includes(settings.timeZone) ? all : [settings.timeZone, ...all];
  }, [settings.timeZone]);

  const values = useMemo<SettingsFormValues>(
    () => ({
      displayName: settings.displayName,
      currency: settings.currency,
      timeZone: settings.timeZone,
      weekStartsOn: String(settings.weekStartsOn) as SettingsFormValues["weekStartsOn"],
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      defaultHourlyRate: settings.defaultHourlyRate != null ? String(settings.defaultHourlyRate) : "",
      theme: settings.theme,
    }),
    [settings],
  );
  const { register, handleSubmit, reset, control, formState } = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema), defaultValues: values });
  useEffect(() => reset(values), [values, reset]);

  const preview = useWatch({ control, name: ["timeZone", "dateFormat", "timeFormat"] });
  const now = new Date();

  const onSubmit = handleSubmit(async (v) => {
    try {
      await updateSettings({
        displayName: v.displayName.trim(),
        currency: v.currency,
        timeZone: v.timeZone,
        weekStartsOn: Number(v.weekStartsOn) as WeekStart,
        dateFormat: v.dateFormat as DateFormat,
        timeFormat: v.timeFormat as TimeFormat,
        defaultHourlyRate: toNumberOrNull(v.defaultHourlyRate),
        theme: v.theme as ThemePreference,
      });
      toast.success("Settings saved", "Dates, totals and reports now use your new preferences.");
    } catch (e) {
      toast.error("Couldn't save settings", errorMessage(e));
    }
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Settings" description="Your profile and how Hourbase calculates and displays time." />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Profile" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Display name" error={formState.errors.displayName?.message}>
              {(a) => <Input {...a} {...register("displayName")} autoComplete="nickname" />}
            </Field>
            <Field label="Email" hint={mode === "demo" ? "Not used in demo mode." : "Managed by your sign-in account."}>
              {(a) => <Input {...a} value={settings.email ?? "—"} readOnly disabled />}
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Billing defaults" description="Used for new projects and for hourly projects without their own rate." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Preferred currency" hint="Headline totals use this currency. Other currencies are shown separately, never converted.">
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
            <Field label="Default hourly rate" optional error={formState.errors.defaultHourlyRate?.message}>
              {(a) => <Input {...a} inputMode="decimal" placeholder="e.g. 80" {...register("defaultHourlyRate")} />}
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Time & display" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Time zone" hint="Days, weeks and reports are calculated in this zone.">
              {(a) => (
                <Select {...a} {...register("timeZone")}>
                  {zones.map((z) => (
                    <option key={z} value={z}>
                      {z.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Week starts on">
              {(a) => (
                <Select {...a} {...register("weekStartsOn")}>
                  <option value="1">Monday</option>
                  <option value="0">Sunday</option>
                  <option value="6">Saturday</option>
                </Select>
              )}
            </Field>
            <Field label="Date format">
              {(a) => (
                <Select {...a} {...register("dateFormat")}>
                  {DATE_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {formatInZone(now, settings.timeZone, f)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Time format">
              {(a) => (
                <Select {...a} {...register("timeFormat")}>
                  <option value="24h">24-hour (14:30)</option>
                  <option value="12h">12-hour (2:30 PM)</option>
                </Select>
              )}
            </Field>
            <Field label="Theme">
              {(a) => (
                <Select {...a} {...register("theme")}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">Match system</option>
                </Select>
              )}
            </Field>
            <div className="flex flex-col justify-end">
              <p className="rounded-xl border border-line bg-bg/40 px-3 py-2.5 text-[13px] text-muted">
                Preview: <span className="tabular text-fg">{formatInZone(now, preview[0] || settings.timeZone, `${preview[1] || settings.dateFormat} · ${timePattern((preview[2] as TimeFormat) || "24h")}`)}</span>
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => reset(values)} disabled={!formState.isDirty}>
            Discard changes
          </Button>
          <Button type="submit" loading={formState.isSubmitting} disabled={!formState.isDirty}>
            Save settings
          </Button>
        </div>
      </form>

      {mode === "demo" ? <DemoDataCard onReset={resetDemo} onClear={clearExampleData} confirm={confirm} /> : <AccountCard email={settings.email} />}
    </div>
  );
}

function DemoDataCard({ onReset, onClear, confirm }: { onReset: () => Promise<void>; onClear: () => Promise<void>; confirm: ReturnType<typeof useConfirm> }) {
  const toast = useToast();
  const { data } = useData();
  const examples = data.entries.filter((e) => e.isDemo).length + data.projects.filter((p) => p.isDemo).length + data.clients.filter((c) => c.isDemo).length;
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>, msg: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(msg);
    } catch (e) {
      toast.error("Action failed", errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card id="data" className="scroll-mt-24">
      <CardHeader title="Demo data" description="You're exploring Hourbase without an account." />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex gap-3 rounded-xl border border-line bg-bg/40 p-4 text-[13px] text-muted">
          <HardDrive className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
          <p>
            Everything is stored in this browser&apos;s local storage only — it isn&apos;t synced, backed up or visible on other devices, and clearing site data erases it. To use accounts and a real database,
            configure Supabase (see the README).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<Trash className="size-4" aria-hidden />}
            disabled={!examples}
            loading={busy === "clear"}
            onClick={async () => {
              if (await confirm({ title: "Remove example data?", description: "Example clients, projects and entries are removed. Anything you created yourself is kept (including example projects your own entries use).", confirmLabel: "Remove examples" }))
                void run("clear", onClear, "Example data removed");
            }}
          >
            Remove example data{examples ? ` (${examples})` : ""}
          </Button>
          <Button
            variant="danger"
            icon={<RotateCcw className="size-4" aria-hidden />}
            loading={busy === "reset"}
            onClick={async () => {
              if (await confirm({ title: "Reset the demo?", description: "All demo data in this browser — including anything you created and a running timer — is replaced with fresh example data. This can't be undone.", confirmLabel: "Reset demo" }))
                void run("reset", onReset, "Demo reset");
            }}
          >
            Reset demo
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AccountCard({ email }: { email: string | null }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const sendReset = async () => {
    if (!email) return;
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password` });
      if (error) throw error;
      toast.success("Check your inbox", `We sent a password reset link to ${email}.`);
    } catch (e) {
      toast.error("Couldn't send reset email", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card id="data" className="scroll-mt-24">
      <CardHeader title="Account & data" />
      <div className="flex flex-col gap-4 p-5">
        <div className="flex gap-3 rounded-xl border border-line bg-bg/40 p-4 text-[13px] text-muted">
          <Database className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <p>Your data is stored in your Supabase database and protected by row-level security — only your account can read or change it.</p>
        </div>
        <Button variant="secondary" className="self-start" icon={<KeyRound className="size-4" aria-hidden />} loading={busy} onClick={sendReset} disabled={!email}>
          Send password reset email
        </Button>
      </div>
    </Card>
  );
}

export default withData(SettingsPage);

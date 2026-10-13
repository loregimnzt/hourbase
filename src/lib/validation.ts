import { z } from "zod";
import { CURRENCIES } from "@/types";

const optionalText = (max: number) => z.string().trim().max(max, `Keep it under ${max} characters.`);

const optionalNumber = z
  .string()
  .trim()
  .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Enter a positive number.");

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required.").max(120, "Keep it under 120 characters."),
  contactName: optionalText(120),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email address."),
  website: z
    .string()
    .trim()
    .refine((v) => v === "" || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(v), "Enter a valid website, e.g. studio.com."),
  notes: optionalText(2000),
});
export type ClientFormValues = z.infer<typeof clientSchema>;

const isoDate = z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date.");

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required.").max(120, "Keep it under 120 characters."),
    clientId: z.string(),
    description: optionalText(1000),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color."),
    status: z.enum(["active", "completed", "archived"]),
    startDate: isoDate,
    deadline: isoDate,
    budgetType: z.enum(["hourly", "fixed"]),
    fixedFee: optionalNumber,
    hourlyRate: optionalNumber,
    estimatedHours: optionalNumber,
    currency: z.enum(CURRENCIES),
    notes: optionalText(2000),
  })
  .superRefine((v, ctx) => {
    if (v.budgetType === "fixed" && (v.fixedFee === "" || Number(v.fixedFee) <= 0)) {
      ctx.addIssue({ code: "custom", path: ["fixedFee"], message: "Fixed-price projects need an agreed fee." });
    }
    if (v.startDate && v.deadline && v.deadline < v.startDate) {
      ctx.addIssue({ code: "custom", path: ["deadline"], message: "Deadline can't be before the start date." });
    }
  });
export type ProjectFormValues = z.infer<typeof projectSchema>;

const hm = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Use HH:MM.");

export const manualEntrySchema = z.object({
  clientId: z.string(),
  projectId: z.string().min(1, "Choose a project."),
  description: z.string().trim().min(1, "Describe what you worked on.").max(300, "Keep it under 300 characters."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  startTime: hm,
  endTime: hm,
  breakMinutes: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= 1440), "Whole minutes between 0 and 1440."),
  billable: z.boolean(),
  notes: optionalText(2000),
});
export type ManualEntryFormValues = z.infer<typeof manualEntrySchema>;

export const timerSchema = z.object({
  clientId: z.string(),
  projectId: z.string().min(1, "Choose a project to start tracking."),
  description: z.string().trim().max(300, "Keep it under 300 characters."),
  billable: z.boolean(),
  notes: optionalText(2000),
});
export type TimerFormValues = z.infer<typeof timerSchema>;

export const settingsSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(80),
  currency: z.enum(CURRENCIES),
  timeZone: z.string().min(1),
  weekStartsOn: z.enum(["0", "1", "6"]),
  dateFormat: z.enum(["MMM d, yyyy", "d MMM yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]),
  timeFormat: z.enum(["24h", "12h"]),
  defaultHourlyRate: optionalNumber,
  theme: z.enum(["dark", "light", "system"]),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const signInSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});
export const emailSchema = z.object({ email: z.email("Enter a valid email address.") });
export const newPasswordSchema = z
  .object({ password: z.string().min(8, "Use at least 8 characters."), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

export const toNumberOrNull = (v: string): number | null => (v.trim() === "" ? null : Number(v));

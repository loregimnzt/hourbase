"use client";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { newPasswordSchema } from "@/lib/validation";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof newPasswordSchema>>({ resolver: zodResolver(newPasswordSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null);
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (error) {
      setError(error.message.includes("session") ? "Your reset link has expired. Request a new one from the sign-in page." : error.message);
      return;
    }
    toast.success("Password updated");
    router.replace("/overview");
    router.refresh();
  });

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="New password" error={formState.errors.password?.message}>
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register("password")} />}
        </Field>
        <Field label="Confirm password" error={formState.errors.confirm?.message}>
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register("confirm")} />}
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}
        <Button type="submit" loading={formState.isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthCard>
  );
}

"use client";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { emailSchema } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    if (error) setError(error.message);
    else setSent(true);
  });

  return (
    <AuthCard
      title="Reset your password"
      description={sent ? undefined : "We'll email you a link to choose a new password."}
      footer={
        <Link href="/login" className="font-medium text-accent-text hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="text-sm text-muted">
          If an account exists for that email, a reset link is on its way. The link expires after a short time.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="Email" error={formState.errors.email?.message}>
            {(a) => <Input {...a} type="email" autoComplete="email" {...register("email")} />}
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signUpSchema } from "@/lib/validation";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setError(null);
    const { data, error } = await getSupabaseBrowserClient().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/overview` },
    });
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.replace("/overview");
      router.refresh();
    } else {
      setSentTo(email);
    }
  });

  return (
    <AuthCard
      title={sentTo ? "Confirm your email" : "Create your account"}
      description={sentTo ? undefined : "Track time and see what every project really earns."}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-text hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {sentTo ? (
        <div className="flex flex-col items-center gap-3 text-center text-sm text-muted">
          <MailCheck className="size-8 text-success" aria-hidden />
          <p>
            We sent a confirmation link to <strong className="text-fg">{sentTo}</strong>. Open it to activate your account.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Field label="Your name" error={formState.errors.displayName?.message}>
            {(a) => <Input {...a} autoComplete="name" {...register("displayName")} />}
          </Field>
          <Field label="Email" error={formState.errors.email?.message}>
            {(a) => <Input {...a} type="email" autoComplete="email" {...register("email")} />}
          </Field>
          <Field label="Password" hint="At least 8 characters." error={formState.errors.password?.message}>
            {(a) => <Input {...a} type="password" autoComplete="new-password" {...register("password")} />}
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={formState.isSubmitting} className="mt-1">
            Create account
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

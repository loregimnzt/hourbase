"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { safeNext } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signInSchema } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    const { error } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "That email and password don't match an account." : error.message);
      return;
    }
    router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
    router.refresh();
  });

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your time and project data."
      footer={
        <>
          New here?{" "}
          <Link href="/signup" className="font-medium text-accent-text hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email" error={formState.errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" {...register("email")} />}
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          {(a) => <Input {...a} type="password" autoComplete="current-password" {...register("password")} />}
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        )}
        <Button type="submit" loading={formState.isSubmitting} className="mt-1">
          Sign in
        </Button>
        <Link href="/forgot-password" className="text-center text-[13px] text-muted hover:text-fg">
          Forgot your password?
        </Link>
      </form>
    </AuthCard>
  );
}

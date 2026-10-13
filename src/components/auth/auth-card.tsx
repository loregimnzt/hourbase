import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8" aria-label={`${BRAND.name} home`}>
        <Logo />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        <div className="mt-6">{isSupabaseConfigured ? children : <DemoNotice />}</div>
      </div>
      {footer && isSupabaseConfigured && <div className="mt-6 text-sm text-muted">{footer}</div>}
    </main>
  );
}

function DemoNotice() {
  return (
    <div className="flex flex-col gap-4 text-sm text-muted">
      <p>
        Accounts aren&apos;t set up for this deployment, so {BRAND.name} runs in <strong className="text-fg">demo mode</strong>: no sign-in needed, and data stays in this browser.
      </p>
      <p className="text-xs text-subtle">To enable sign-up and a real database, add your Supabase URL and publishable key to the environment (see README).</p>
      <ButtonLink href="/overview">Explore the demo</ButtonLink>
    </div>
  );
}

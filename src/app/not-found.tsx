import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist or was moved.</p>
      </div>
      <ButtonLink href="/overview">Back to overview</ButtonLink>
    </main>
  );
}

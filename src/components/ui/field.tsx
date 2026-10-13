import { type ComponentProps, type ReactNode, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const inputClasses =
  "h-10 w-full rounded-xl border border-line-strong bg-bg/60 px-3 text-sm text-fg placeholder:text-subtle transition-colors hover:border-subtle/60 focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-danger disabled:opacity-60";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClasses, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClasses, "h-auto min-h-20 py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClasses, "appearance-none pr-9", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
    </div>
  );
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  /** Render-prop receives the generated id and aria props for the control. */
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
  optional?: boolean;
}

export function Field({ label, hint, error, className, children, optional }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-muted">
        {label}
        {optional && <span className="ml-1 font-normal text-subtle">(optional)</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

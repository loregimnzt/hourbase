import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "border border-line-strong bg-elevated text-fg hover:bg-hover",
  ghost: "text-muted hover:bg-hover hover:text-fg",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-bg",
  success: "bg-success text-bg hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
  icon: "h-9 w-9",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function ButtonLink({ variant = "primary", size = "md", icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

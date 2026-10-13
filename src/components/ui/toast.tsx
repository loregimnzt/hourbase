"use client";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, title, description }]);
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
    }),
    [push],
  );

  return (
    <ToastContext value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CircleCheck : t.tone === "error" ? CircleAlert : Info;
          return (
            <div key={t.id} role={t.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-2xl border border-line-strong bg-elevated px-4 py-3 shadow-card">
              <Icon aria-hidden className={cn("mt-0.5 size-4.5 shrink-0", t.tone === "success" && "text-success", t.tone === "error" && "text-danger", t.tone === "info" && "text-accent-text")} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] text-muted">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="rounded-md p-0.5 text-subtle hover:text-fg">
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

"use client";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}

/**
 * Accessible modal built on the native <dialog> element: focus is trapped,
 * Escape closes it, and the rest of the page is inert. On small screens it
 * renders as a bottom sheet.
 */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      aria-labelledby="modal-title"
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl border border-line-strong bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-[2px]",
        "sm:m-auto sm:rounded-2xl open:animate-slide-up",
        size === "sm" && "sm:max-w-md",
        size === "md" && "sm:max-w-xl",
        size === "lg" && "sm:max-w-3xl",
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 id="modal-title" className="text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close dialog" className="-mr-1.5 rounded-lg p-1.5 text-subtle hover:bg-hover hover:text-fg">
              <X className="size-4.5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-bg/30 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

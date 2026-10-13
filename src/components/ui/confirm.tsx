"use client";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Promise-based confirmation dialog for destructive actions. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext value={confirm}>
      {children}
      <Modal
        open={Boolean(opts)}
        onClose={() => close(false)}
        size="sm"
        title={opts?.title ?? ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={opts?.tone === "primary" ? "primary" : "danger"} onClick={() => close(true)} autoFocus>
              {opts?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <div className="text-sm leading-relaxed text-muted">{opts?.description}</div>
      </Modal>
    </ConfirmContext>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}

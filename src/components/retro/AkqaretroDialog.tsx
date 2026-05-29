"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DialogBase {
  title?: string;
  message: string;
  confirmLabel?: string;
}

interface ConfirmOptions extends Omit<DialogBase, "message"> {
  cancelLabel?: string;
  destructive?: boolean;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function DialogPanel({
  mode,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  mode: "confirm" | "alert";
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const focusables = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    cancelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== "Tab" || focusables.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="akqaretro-dialog fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role={mode === "confirm" ? "alertdialog" : "alertdialog"}
      aria-modal="true"
      aria-labelledby="akqaretro-dialog-title"
      aria-describedby="akqaretro-dialog-message"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        ref={panelRef}
        className="akqaretro-dialog__panel w-full max-w-md border border-[var(--akqa-border)] bg-[var(--surface-elevated)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 id="akqaretro-dialog-title" className="akqaretro-headline text-lg font-normal text-[var(--foreground)] mb-2">
            {title}
          </h2>
        )}
        <p id="akqaretro-dialog-message" className="akqaretro-caption text-[var(--foreground)] mb-6 whitespace-pre-wrap">
          {message}
        </p>
        <div className="akqaretro-dialog__actions flex flex-wrap justify-end gap-2">
          {mode === "confirm" && (
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="akqaretro-dialog__cancel akqaretro-touch-target border border-[var(--akqa-border)] bg-transparent px-4 text-sm text-[var(--foreground)] hover:bg-[var(--akqa-border)]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)]"
            >
              {cancelLabel ?? "Cancel"}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            autoFocus={mode === "alert"}
            className={`akqaretro-dialog__confirm akqaretro-touch-target px-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] ${
              destructive
                ? "border border-[var(--akqa-error)] bg-[var(--akqa-error)] text-[var(--akqa-white)] hover:opacity-90"
                : "border border-[var(--akqa-dove)] bg-[var(--akqa-dove)] text-[var(--akqa-white)] hover:opacity-90"
            }`}
          >
            {confirmLabel ?? (mode === "confirm" ? "Confirm" : "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useAkqaretroDialog() {
  const [state, setState] = useState<{
    mode: "confirm" | "alert";
    message: string;
    options: ConfirmOptions;
  } | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ mode: "confirm", message, options: options ?? {} });
    });
  }, []);

  const alert = useCallback((message: string, options?: Omit<DialogBase, "message">) => {
    return new Promise<void>((resolve) => {
      resolveRef.current = (ok) => {
        if (ok) resolve();
      };
      setState({ mode: "alert", message, options: options ?? {} });
    });
  }, []);

  const dialog = state ? (
    <DialogPanel
      mode={state.mode}
      title={state.options.title}
      message={state.message}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      destructive={state.options.destructive}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  ) : null;

  return { confirm, alert, dialog };
}

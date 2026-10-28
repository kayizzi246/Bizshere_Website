"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

/**
 * Delete button that opens a confirmation pop-up first; used for permanent deletes.
 * Confirming clicks a hidden submit button inside the same form, so the server action
 * (`action`, run as that button's formAction) receives the form's fields as usual.
 * The pop-up is rendered into the admin shell so it follows light/dark mode.
 */
export function ConfirmButton({ action, title = "Delete permanently?", message, children, className = "" }: {
  action: (form: FormData) => Promise<void>;
  title?: string;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const submit = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !pending) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, pending]);

  const modal = open ? (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <div aria-hidden className="absolute inset-0 bg-[#06294A]/55 backdrop-blur-sm" onClick={() => !pending && setOpen(false)} />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text"
        className="onboard-pop relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface text-ink">
        <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-page hover:text-ink">
          <X aria-hidden className="h-4 w-4" />
        </button>
        <div className="flex flex-col gap-4 p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bad-bg text-bad-fg"><AlertTriangle aria-hidden className="h-6 w-6" /></span>
          <div className="flex flex-col gap-1.5">
            <h2 id="confirm-title" className="font-sans text-lg font-black tracking-tight text-heading">{title}</h2>
            <p id="confirm-text" className="text-sm leading-relaxed text-ink-soft">{message}</p>
          </div>
          <ul className="flex flex-col gap-1 rounded-xl bg-page p-3 text-[13px] text-ink-muted">
            <li>• Its details, offers, rounds, fees, budgets and versions</li>
            <li>• Media, sources, checks, revisions and saved copies</li>
            <li className="font-semibold text-bad-fg">• This cannot be undone</li>
          </ul>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line bg-page/60 px-6 py-4 sm:flex-row sm:justify-end">
          <button ref={cancel} type="button" onClick={() => setOpen(false)} disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:border-brand hover:text-brand">
            Cancel
          </button>
          <button type="button" onClick={() => submit.current?.click()} disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#C7362B] px-5 text-sm font-semibold text-white hover:bg-[#A82C23] disabled:opacity-70">
            {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Trash2 aria-hidden className="h-4 w-4" />}
            {pending ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-full border border-bad-fg/30 bg-bad-bg px-4 text-[13px] font-semibold text-bad-fg hover:border-bad-fg ${className}`}>
        <Trash2 aria-hidden className="h-3.5 w-3.5" />{children}
      </button>
      {/* The real submit, clicked from the pop-up; it stays inside the form so the form's fields are sent. */}
      <button ref={submit} type="submit" formAction={action} hidden aria-hidden tabIndex={-1} />
      {modal && typeof document !== "undefined" ? createPortal(modal, document.getElementById("admin-shell") ?? document.body) : null}
    </>
  );
}

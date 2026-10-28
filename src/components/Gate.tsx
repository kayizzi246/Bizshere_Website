"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * "Show more" lock card plus the subscribe popup.
 *
 * The blurred rows behind it are FAKE filler passed in as `teaser` (e.g. "UGX 0,000,000"),
 * never the real data. Real member-only data is not sent for visitors at all.
 */
export function Gate({
  title,
  text,
  button = "Show more",
  teaser,
  compact = false,
  modalTitle = "Subscribe to see everything",
}: {
  title?: string;
  text?: string;
  button?: string;
  teaser?: React.ReactNode;
  compact?: boolean;
  modalTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative">
        {teaser ? <div aria-hidden className="blurred">{teaser}</div> : null}
        <div className={`${teaser ? "absolute inset-0" : ""} flex items-center justify-center bg-white/40 py-4`}>
          {compact ? (
            <button type="button" onClick={() => setOpen(true)} className="btn border border-brand bg-white text-brand">
              <Lock /> {button}
            </button>
          ) : (
            <div className="flex max-w-sm flex-col items-center gap-2.5 rounded-2xl border border-line bg-white px-6 py-5 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand"><Lock /></span>
              {title ? <span className="text-[17px] font-extrabold">{title}</span> : null}
              {text ? <span className="text-sm text-ink-muted">{text}</span> : null}
              <button type="button" onClick={() => setOpen(true)} className="btn-primary">{button}</button>
            </div>
          )}
        </div>
      </div>
      {open ? <SubscribeModal title={modalTitle} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function SubscribeModal({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="gate-title" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 px-4 pt-24" onClick={onClose}>
      <div className="w-full max-w-[540px] overflow-hidden rounded-[20px] bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-ink px-7 py-5">
          <span className="flex items-center gap-2.5 text-sm font-bold text-brand-mint"><Lock /> Members only</span>
          <button type="button" onClick={onClose} aria-label="Close" className="h-10 w-10 rounded-lg text-xl text-white">×</button>
        </div>
        <div className="flex flex-col gap-4 p-7">
          <h2 id="gate-title" className="text-[26px] font-extrabold tracking-tight">{title}</h2>
          <ul className="flex flex-col gap-2.5 text-[15px]">
            {["Full business plans and startup budgets", "Supplier and expert contact details", "Full funding terms with deadline alerts", "Price history, templates and downloads"].map((t) => (
              <li key={t} className="flex gap-2.5"><Check /> {t}</li>
            ))}
          </ul>
          <Link href="/membership" className="btn-primary min-h-[52px] text-base">See membership plans</Link>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-ink-muted">Pay with mobile money or card</span>
            <Link href="/login" className="font-bold">Already subscribed? Get your access back</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Lock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function Check() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0172CE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

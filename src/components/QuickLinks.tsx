"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

type Service = { href: string; icon: string; nav: string };

/**
 * Phones and tablets: a floating "Services" button that opens a panel with every directory.
 * Sits above the sticky download bar on pages that have one ([data-sticky-bar]).
 */
export function QuickLinks({ services }: { services: Service[] }) {
  const [open, setOpen] = useState(false);
  const [raised, setRaised] = useState(false);
  const path = usePathname();

  useEffect(() => {
    setOpen(false);
    // Wait a frame so the new page's sticky bar (if any) is in the DOM.
    const id = requestAnimationFrame(() => setRaised(Boolean(document.querySelector("[data-sticky-bar]"))));
    return () => cancelAnimationFrame(id);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        className={`fixed right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-brand pl-4 pr-5 font-display text-sm font-bold text-white ring-4 ring-white transition-[bottom] ${raised ? "bottom-[92px]" : "bottom-5"}`}>
        <span className="grid h-6 w-6 grid-cols-2 gap-0.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => <span key={i} className={`rounded-[3px] ${i === 3 ? "bg-accent" : "bg-white"}`} />)}
        </span>
        Services
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end" role="presentation">
          <div aria-hidden className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="quick-links-title"
            className="onboard-pop relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-3">
            <span aria-hidden className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line-strong" />
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="quick-links-title" className="font-sans text-lg font-black text-heading">All services</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-heading">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid grid-cols-3 gap-2.5">
              {services.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} onClick={() => setOpen(false)}
                    className="flex h-full min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white p-3 text-center text-[12px] font-semibold leading-tight text-heading active:bg-brand-tint">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={s.icon} className="h-5 w-5" /></span>
                    {s.nav}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/search" onClick={() => setOpen(false)} className="btn-primary mt-4 w-full">
              <Icon name="search" className="h-4 w-4" />Search everything
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

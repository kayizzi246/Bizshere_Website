"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { Icon } from "./Icon";

type Service = { href: string; icon: string; nav: string; text: string };

/** Four squares, one orange: the "all services" mark on both buttons. */
const Grid = ({ className = "h-6 w-6" }: { className?: string }) => (
  <span className={`grid shrink-0 grid-cols-2 gap-0.5 ${className}`} aria-hidden>
    {[0, 1, 2, 3].map((i) => <span key={i} className={`rounded-[3px] ${i === 3 ? "bg-accent" : "bg-current"}`} />)}
  </span>
);

/**
 * Phones and tablets: a floating "All services" button that opens a panel with every directory.
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

  // Like the desktop rail: not on single items (it covered their buttons) or account pages; the header
  // menu lists every directory anyway.
  if (hideQuickLinks(path)) return null;

  return (
    <div className="lg:hidden">
      <button type="button" data-quick-services="" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}
        data-chrome="" className={`spin-border fixed right-4 z-40 rounded-full p-[3px] transition-[bottom] ${raised ? "bottom-[92px]" : "bottom-5"}`}>
        {/* Plain orange ring (.spin-border in globals.css) */}
        <span className="inline-flex h-[50px] items-center gap-2 rounded-full bg-brand pl-4 pr-5 font-display text-sm font-bold text-white">
          <Grid className="h-6 w-6 text-white" />
          All services
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end" role="presentation">
          {/* No onClick: a tap outside doesn't close the sheet, only its × button (or picking a service) does */}
          <div aria-hidden className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
          <div role="dialog" aria-modal="true" aria-labelledby="quick-links-title"
            className="onboard-pop relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-3">
            <span aria-hidden className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line-strong" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 id="quick-links-title" className="font-display text-lg font-extrabold text-heading">All services</h2>
                <p className="text-[13px] text-ink-muted">Everything on BizSphere-Ug. Tap one to open it.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-heading">
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

/**
 * Desktop: an "All services" button in the bottom-left corner (two cards peeking behind it, as a small
 * deck). Pointing at it, or clicking it, opens a panel above it with every service: its icon, name and
 * what it is for, in two columns, and Search everything at the bottom. It closes when the pointer
 * leaves, on Escape, or on a click elsewhere.
 */
export function ServiceRail({ services }: { services: Service[] }) {
  const [open, setOpen] = useState(false);
  const inside = useRef(false); // the pointer is over it: a click then keeps it open (it closes when the pointer leaves)
  const ref = useRef<HTMLElement>(null);
  const path = usePathname();

  // Close again after following one of its links.
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  // Search has its own filter column in that corner.
  if (path.startsWith("/search")) return null;
  // Out of the way on single items (it covered product photos and forms) and on account pages.
  if (hideQuickLinks(path)) return null;

  return (
    <nav ref={ref} aria-label="All services" data-chrome="" className="fixed bottom-5 left-5 z-30 hidden lg:block"
      onMouseEnter={() => { inside.current = true; setOpen(true); }} onMouseLeave={() => { inside.current = false; setOpen(false); }}>
      {/* The panel. Its bottom padding bridges the gap to the button, so the pointer can cross it. */}
      <div id="service-panel" className={`absolute bottom-full left-0 pb-3 motion-safe:transition-[opacity,transform,visibility] motion-safe:duration-200 ${open ? "visible translate-y-0 opacity-100" : "invisible translate-y-2 opacity-0"}`}>
        <div className="flex max-h-[calc(100vh-120px)] w-[min(640px,calc(100vw-40px))] flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-[0_18px_50px_rgb(7_26_51/0.22)]">
          <div className="flex flex-col gap-0.5 px-1">
            <h2 className="font-display text-[17px] font-extrabold text-heading">All services</h2>
            <p className="text-[13px] text-ink-muted">Everything on BizSphere-Ug. Pick one to open it.</p>
          </div>
          <ul className="grid grid-cols-2 gap-1">
            {services.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="group flex items-center gap-3 rounded-xl p-2 text-heading hover:bg-brand-tint hover:text-heading">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand group-hover:bg-brand group-hover:text-white"><Icon name={s.icon} className="h-5 w-5" /></span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-[14px] font-bold leading-tight">{s.nav}</span>
                    <span className="line-clamp-1 text-[12px] text-ink-muted">{s.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/search" className="btn-primary min-h-[44px] w-full text-[14px]"><Icon name="search" className="h-4 w-4" />Search everything</Link>
        </div>
      </div>

      <button type="button" aria-expanded={open} aria-controls="service-panel"
        onClick={() => setOpen((o) => (inside.current ? true : !o))}
        className="relative block h-14 w-[260px]">
        {/* Two cards peeking behind: the deck */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-11 -translate-y-3 scale-90 rounded-[10px] border-2 border-white bg-brand" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-11 -translate-y-1.5 scale-95 rounded-[10px] border-2 border-white bg-brand" />
        <span className="absolute inset-x-0 bottom-0 flex h-11 items-center justify-center gap-2.5 rounded-[10px] border-2 border-white bg-accent px-4 font-display text-[14px] font-bold text-ink transition-colors hover:bg-brand-deep hover:text-white">
          <Grid className="h-5 w-5" />
          All services
          <span className="rounded-full bg-white/80 px-1.5 text-[11px] font-extrabold text-ink">{services.length}</span>
          <ChevronUp aria-hidden className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
    </nav>
  );
}

/** Single items (/machines/x, /suppliers/x/products/y) and account pages keep the screen for their content. */
function hideQuickLinks(path: string) {
  return path.split("/").filter(Boolean).length >= 2 || ["/supplier", "/account", "/membership"].includes(path);
}

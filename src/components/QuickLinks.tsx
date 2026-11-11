"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp } from "lucide-react";
import { Icon } from "./Icon";

type Service = { href: string; icon: string; nav: string; text: string };

/**
 * The colour of each service as a light tint behind its icon, the same colours as on the homepage, so the
 * panel reads as twelve different things and not twelve blue squares (client, 11 Nov 2026: make it premium).
 */
const TINT: Record<string, string> = {
  "/business-ideas": "bg-[#E3F3EC] text-[#0F5B3E]", "/machines": "bg-[#E6ECF5] text-[#0B2A5C]", "/suppliers": "bg-[#E3F1FA] text-[#0E5E94]",
  "/funding": "bg-[#FDEFD9] text-[#B45F06]", "/guides": "bg-[#ECEBFB] text-[#4338CA]", "/experts": "bg-[#F1E8F8] text-[#4A1D6B]",
  "/tools": "bg-[#E4F3F1] text-[#0F766E]", "/prices": "bg-[#FDE8EB] text-[#C8102E]", "/websites": "bg-[#EDF0F4] text-[#475467]",
  "/news": "bg-[#F6EEDF] text-[#8B5E1A]", "/tips": "bg-[#FCE8F1] text-[#BE185D]", "/forum": "bg-[#FDF3D0] text-[#8A6A00]",
};
const tint = (href: string) => TINT[href] ?? "bg-brand-tint text-brand";

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
        <span className="hero-premium inline-flex h-[46px] items-center gap-2 rounded-full pl-4 pr-5 font-display text-sm font-bold text-white">
          <Grid className="h-5 w-5 text-white" />
          All services
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end" role="presentation">
          {/* No onClick: a tap outside doesn't close the sheet, only its × button (or picking a service) does */}
          <div aria-hidden className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
          {/* The sheet: a dark header in the hero colour (title, close, search), then the services as white
              tiles on a soft grey, each with its icon on its own colour. data-lenis-prevent: it scrolls by itself. */}
          <div role="dialog" aria-modal="true" aria-labelledby="quick-links-title" data-lenis-prevent=""
            className="onboard-pop relative max-h-[88vh] w-full overflow-y-auto overscroll-contain rounded-t-[28px] bg-[#F3F6FA]">
            <div className="hero-premium flex flex-col gap-4 px-5 pb-5 pt-3 text-white">
              <span aria-hidden className="mx-auto block h-1.5 w-10 rounded-full bg-white/30" />
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 id="quick-links-title" className="font-display text-xl font-extrabold text-white">All services</h2>
                  <p className="text-[13px] text-white/70">Everything on BizSphere-Ug. Tap one to open it.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
              <Link href="/search" onClick={() => setOpen(false)} className="flex h-12 items-center gap-2.5 rounded-2xl bg-white px-4 text-[14px] text-ink-muted hover:text-ink-muted">
                <Icon name="search" className="h-[18px] w-[18px] text-brand" />Search everything
              </Link>
            </div>
            <ul className="grid grid-cols-3 gap-2.5 px-4 pb-8 pt-4">
              {services.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} onClick={() => setOpen(false)}
                    className="flex h-full min-h-[100px] flex-col items-center justify-center gap-2.5 rounded-2xl bg-white p-3 text-center text-[12px] font-semibold leading-tight text-heading shadow-[0_1px_3px_rgba(7,26,51,0.08)] transition-transform hover:text-heading active:scale-[0.97]">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tint(s.href)}`}><Icon name={s.icon} className="h-5 w-5" strokeWidth={1.75} /></span>
                    {s.nav}
                  </Link>
                </li>
              ))}
            </ul>
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
        <div className="flex max-h-[calc(100vh-120px)] w-[min(660px,calc(100vw-40px))] flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_60px_rgb(7_26_51/0.28)]">
          {/* A dark header in the hero colour: the title, and search on the right */}
          <div className="hero-premium flex items-center justify-between gap-4 px-5 py-4 text-white">
            <div className="flex flex-col gap-0.5">
              <h2 className="font-display text-[17px] font-extrabold text-white">All services</h2>
              <p className="text-[13px] text-white/70">Everything on BizSphere-Ug. Pick one to open it.</p>
            </div>
            <Link href="/search" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-heading hover:bg-accent hover:text-ink"><Icon name="search" className="h-4 w-4 text-brand" />Search everything</Link>
          </div>
          <ul data-lenis-prevent="" className="grid grid-cols-2 gap-1 overflow-y-auto p-3">
            {services.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="group flex items-center gap-3 rounded-2xl p-2.5 text-heading transition-colors hover:bg-[#F3F6FA] hover:text-heading">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${tint(s.href)}`}><Icon name={s.icon} className="h-5 w-5" strokeWidth={1.75} /></span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-[14px] font-bold leading-tight">{s.nav}</span>
                    <span className="line-clamp-1 text-[12px] text-ink-muted">{s.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button type="button" aria-expanded={open} aria-controls="service-panel"
        onClick={() => setOpen((o) => (inside.current ? true : !o))}
        className="relative block h-14 w-[260px]">
        {/* Two cards peeking behind: the deck */}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-11 -translate-y-3 scale-90 rounded-xl border-2 border-white bg-brand" />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-11 -translate-y-1.5 scale-95 rounded-xl border-2 border-white bg-accent" />
        <span className="absolute inset-x-0 bottom-0 flex h-11 items-center justify-center gap-2.5 hero-premium rounded-xl border-2 border-white px-4 font-display text-[14px] font-bold text-white transition-[filter] hover:brightness-125">
          <Grid className="h-5 w-5" />
          All services
          <span className="rounded-full bg-accent px-1.5 text-[11px] font-extrabold text-ink">{services.length}</span>
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

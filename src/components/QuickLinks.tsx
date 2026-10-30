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
        className={`spin-border fixed right-4 z-40 rounded-full p-[3px] transition-[bottom] ${raised ? "bottom-[92px]" : "bottom-5"}`}>
        {/* The orange border travels round the edge (.spin-border in globals.css) */}
        <span className="inline-flex h-[50px] items-center gap-2 rounded-full bg-brand pl-4 pr-5 font-display text-sm font-bold text-white">
          <span className="grid h-6 w-6 grid-cols-2 gap-0.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => <span key={i} className={`rounded-[3px] ${i === 3 ? "bg-accent" : "bg-white"}`} />)}
          </span>
          Services
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end" role="presentation">
          <div aria-hidden className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="quick-links-title"
            className="onboard-pop relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-3">
            <span aria-hidden className="mx-auto mb-4 block h-1.5 w-10 rounded-full bg-line-strong" />
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="quick-links-title" className="font-display text-lg font-bold text-heading">All services</h2>
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

const STEP = 50; // button height (44px) + gap (6px)

/**
 * Desktop quick links to every service (URSB-style), floating in the bottom-left corner.
 * On arrival they sit stacked as a small deck of cards (Search on top, two cards peeking behind);
 * they unfold upward into a line, bottom first, only while the visitor hovers (or tabs into) the deck.
 */
export function ServiceRail({ services }: { services: Service[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // Fold the deck again after following one of its links.
  useEffect(() => setOpen(false), [path]);

  const items = [{ href: "/search", nav: "Search everything", search: true }, ...services.map((s) => ({ href: s.href, nav: s.nav, search: false }))];
  const n = items.length;
  // Search has its own filter column in that corner.
  if (path.startsWith("/search")) return null;
  // White outline so the buttons stay distinct over the blue hero and over white sections alike.
  const button = "absolute inset-x-0 flex h-11 items-center justify-center rounded-[10px] border-2 border-white px-5 text-center font-display text-[14px] font-bold leading-tight motion-safe:transition-[transform,opacity,background-color] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(0.2,0.8,0.2,1)]";

  return (
    <nav aria-label="Quick links to services" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
      className="fixed bottom-5 left-5 z-30 hidden w-[260px] lg:block" style={{ height: open ? n * STEP - 6 : 56 }}>
      {items.map((it, i) => {
        const fromBottom = n - 1 - i; // 0 for the last button
        const depth = i; // 0 = front card of the deck
        const style: React.CSSProperties = open
          // In line: each button in its own row, unfolding from the bottom up.
          ? { bottom: fromBottom * STEP, transform: "none", opacity: 1, zIndex: n - i, transitionDelay: `${fromBottom * 35}ms` }
          // Deck: all at the bottom, the front card in full and two peeking above it, smaller.
          : { bottom: 0, transform: `translateY(${-Math.min(depth, 2) * 6}px) scale(${1 - Math.min(depth, 2) * 0.05})`, opacity: depth > 2 ? 0 : 1, zIndex: n - i, transitionDelay: "0ms", pointerEvents: depth === 0 ? "auto" : "none" };
        return (
          <Link key={it.href} href={it.href} style={style} tabIndex={open || depth === 0 ? 0 : -1}
            className={`${button} ${it.search ? "bg-accent text-ink hover:bg-brand-deep hover:text-white" : "bg-brand text-white hover:bg-accent hover:text-ink"}`}>
            {it.nav}
          </Link>
        );
      })}
    </nav>
  );
}

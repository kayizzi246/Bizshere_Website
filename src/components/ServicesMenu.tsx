"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, LayoutGrid, Search, X } from "lucide-react";
import { Icon } from "./Icon";
import { hideQuickLinks, isHere, serviceGroups, type Service } from "./QuickLinks";

/**
 * Computers: the "Services" button, bottom left, and the menu it opens above it (redesigned 24 Nov 2026, client, to
 * match the phone sheet). A search box, then the services in three columns of grouped lists, each with its icon, name
 * and what it is for; the page you are on is marked. Opens on a click, closes on Escape, a click elsewhere, or when
 * focus leaves it. Not on search, which has its own filters in that corner.
 */
export function ServicesMenu({ services }: { services: Service[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Close after following one of its links.
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  if (path.startsWith("/search") || hideQuickLinks(path)) return null;

  return (
    <nav ref={root} aria-label="Services" data-chrome="" className="fixed bottom-5 left-5 z-[44] hidden lg:block"
      onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false); }}>
      <div id="services-menu" inert={!open}
        className={`absolute bottom-full left-0 mb-3 origin-bottom-left motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out ${open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-1.5 scale-[0.98] opacity-0"}`}>
        <div className="flex max-h-[calc(100vh-150px)] w-[min(880px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl border border-line bg-page shadow-[0_24px_60px_rgb(7_26_51/0.22)]">
          <div className="flex shrink-0 items-center gap-4 border-b border-line bg-white px-5 py-3.5">
            <h2 className="!text-[17px] text-heading">Services</h2>
            <Link href="/search" className="flex h-10 flex-1 items-center gap-2.5 rounded-xl bg-[#EEF1F5] px-3.5 text-[13px] text-ink-muted transition-colors hover:bg-[#E3E8EE] hover:text-ink-muted">
              <Search aria-hidden className="h-4 w-4" />Search everything
            </Link>
            <button type="button" onClick={() => { setOpen(false); button.current?.focus(); }} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-[#EEF1F5]"><X aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} /></button>
          </div>

          <div data-lenis-prevent="" className="grid min-h-0 grid-cols-3 gap-4 overflow-y-auto p-4">
            {serviceGroups(services).map(([title, list]) => (
              <section key={title} aria-label={title} className="flex min-w-0 flex-col gap-2">
                <p data-size="" className="px-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{title}</p>
                <ul className="flex flex-col gap-0.5 rounded-xl bg-white p-1.5">
                  {list.map((s) => {
                    const here = isHere(path, s.href);
                    return (
                      <li key={s.href}>
                        <Link href={s.href} aria-current={here ? "page" : undefined}
                          className={`group flex items-center gap-3 rounded-lg p-2 text-heading transition-colors hover:bg-page hover:text-heading ${here ? "bg-accent-tint/60" : ""}`}>
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-transform duration-150 group-hover:scale-105 ${here ? "bg-accent text-ink" : "bg-brand-deep text-white"}`}><Icon name={s.icon} className="h-[18px] w-[18px]" strokeWidth={2} /></span>
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-[13px] font-semibold leading-tight">{s.nav}</span>
                            <span className="truncate text-[12px] leading-tight text-ink-muted">{here ? "You are here" : s.text}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>

      <button ref={button} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="services-menu"
        className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1F44] pl-4 pr-4 text-[13px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-[#12306A] active:scale-95">
        <LayoutGrid aria-hidden className="h-[18px] w-[18px] text-accent" strokeWidth={2.2} />Services
        <ChevronUp aria-hidden className={`h-4 w-4 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
    </nav>
  );
}

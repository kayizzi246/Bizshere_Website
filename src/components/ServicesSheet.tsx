"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutGrid, Search, X } from "lucide-react";
import { Icon } from "./Icon";
import { hideQuickLinks, isHere, serviceGroups, type Service } from "./QuickLinks";

const CLOSE_MS = 280;

/**
 * Phones and tablets: the "Services" button, bottom left, and the sheet it opens (redesigned 24 Nov 2026, client).
 * The sheet rises from the bottom: a search box, then the services in three grouped lists, each with its icon, its
 * name and what it is for; the page you are on is marked. It follows the finger and closes on a swipe down from its
 * top, a tap outside, × or Escape. The button sits above a bar along the bottom on pages that have one.
 */
export function ServicesSheet({ services }: { services: Service[] }) {
  const path = usePathname();
  const [mounted, setMounted] = useState(false); // in the page
  const [shown, setShown] = useState(false); // risen
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [raised, setRaised] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; t: number } | null>(null);

  const close = useCallback(() => { setShown(false); setDrag(0); setDragging(false); start.current = null; }, []);

  // Opening: in the page first, then up on the next frame, so it slides.
  useEffect(() => {
    if (!mounted) return;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => { setShown(true); sheet.current?.focus({ preventScroll: true }); }));
    return () => cancelAnimationFrame(frame);
  }, [mounted]);

  // Closing: out of the page once it has slid away.
  const wasShown = useRef(false);
  useEffect(() => {
    if (shown) { wasShown.current = true; return; }
    if (!wasShown.current) return;
    wasShown.current = false;
    const t = setTimeout(() => setMounted(false), CLOSE_MS);
    return () => clearTimeout(t);
  }, [shown]);

  useEffect(() => {
    close();
    // Wait a frame so the new page's bar (if any) is there.
    const id = requestAnimationFrame(() => setRaised(Boolean(document.querySelector("[data-sticky-bar], [data-list-bar]"))));
    return () => cancelAnimationFrame(id);
  }, [path, close]);

  // While it is open: Escape closes, Tab stays inside, the page behind stays still.
  useEffect(() => {
    if (!mounted) return;
    const back = opener.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !sheet.current) return;
      const items = sheet.current.querySelectorAll<HTMLElement>("a[href], button");
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      back?.focus({ preventScroll: true });
    };
  }, [mounted, close]);

  if (hideQuickLinks(path)) return null;

  const groups = serviceGroups(services);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("a, button")) return;
    start.current = { y: e.clientY, t: e.timeStamp };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => { if (start.current) setDrag(Math.max(0, e.clientY - start.current.y)); };
  const onUp = (e: React.PointerEvent) => {
    const from = start.current;
    if (!from) return;
    start.current = null;
    setDragging(false);
    const moved = e.clientY - from.y;
    // Far enough, or a quick flick
    if (moved > 100 || (moved > 24 && moved / Math.max(1, e.timeStamp - from.t) > 0.3)) close();
    else setDrag(0);
  };

  return (
    <div className="lg:hidden">
      <button ref={opener} type="button" data-quick-services="" data-chrome="" onClick={() => setMounted(true)} aria-haspopup="dialog" aria-expanded={mounted}
        className={`fixed left-4 z-[44] inline-flex h-12 items-center gap-2 rounded-full bg-[#0B1F44] pl-4 pr-5 text-[14px] font-semibold text-white transition-[bottom,transform] duration-200 active:scale-95 ${raised ? "bottom-[92px]" : "bottom-5"}`}>
        <LayoutGrid aria-hidden className="h-[18px] w-[18px] text-accent" strokeWidth={2.2} />Services
      </button>

      {mounted ? (
        <div className="fixed inset-0 z-[80] flex items-end">
          <div aria-hidden onClick={close} className={`absolute inset-0 bg-[#061230]/60 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`} />
          <div ref={sheet} role="dialog" aria-modal="true" aria-labelledby="services-title" tabIndex={-1}
            className={`relative flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-[#F2F4F7] outline-none motion-reduce:transition-none ${dragging ? "" : "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"}`}
            style={{ transform: shown ? `translateY(${drag}px)` : "translateY(100%)" }}>
            {/* The top takes the swipe down */}
            <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} className="shrink-0 cursor-grab touch-none select-none px-4 pb-3 pt-2.5">
              <span aria-hidden className="mx-auto mb-3 block h-[5px] w-9 rounded-full bg-[#C3C9D4]" />
              <div className="flex items-center justify-between gap-3">
                <h2 id="services-title" className="!text-[22px] text-heading">Services</h2>
                <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E1E5EB] text-ink-soft active:bg-[#D3D9E2]"><X aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.4} /></button>
              </div>
              <Link href="/search" onClick={close} className="mt-3 flex h-11 items-center gap-2.5 rounded-xl bg-[#E1E5EB] px-3.5 text-[15px] text-[#5B6472] hover:text-[#5B6472]">
                <Search aria-hidden className="h-[18px] w-[18px]" />Search everything
              </Link>
            </div>

            <div data-lenis-prevent="" className="flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-1">
              {groups.map(([title, list]) => (
                <section key={title} aria-label={title} className="flex flex-col gap-2">
                  <p data-size="" className="px-1 text-[13px] font-semibold text-[#5B6472]">{title}</p>
                  <ul className="overflow-hidden rounded-2xl bg-white">
                    {list.map((s, n) => {
                      const here = isHere(path, s.href);
                      return (
                        <li key={s.href}>
                          <Link href={s.href} onClick={close} aria-current={here ? "page" : undefined} className="flex items-center gap-3.5 pl-3.5 text-heading hover:text-heading active:bg-[#F2F4F7]">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${here ? "bg-accent text-ink" : "bg-brand-deep text-white"}`}><Icon name={s.icon} className="h-[18px] w-[18px]" strokeWidth={2} /></span>
                            <span className={`flex min-w-0 flex-1 items-center gap-2 py-3 pr-3.5 ${n ? "border-t border-line" : ""}`}>
                              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="text-[15px] font-semibold leading-tight">{s.nav}</span>
                                <span className="truncate text-[12.5px] leading-tight text-[#5B6472]">{s.text}</span>
                              </span>
                              {here ? <span className="shrink-0 rounded-full bg-accent-tint px-2 py-0.5 text-[11px] font-semibold text-accent-dark">You are here</span> : <ChevronRight aria-hidden className="h-[18px] w-[18px] shrink-0 text-[#B6BDC8]" />}
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
      ) : null}
    </div>
  );
}

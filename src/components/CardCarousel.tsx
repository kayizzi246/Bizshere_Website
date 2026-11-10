"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * A row of cards that slides sideways: swipe on a phone, the two arrow buttons anywhere. The cards come from
 * the server as children (each an <li>), so this file holds only the scrolling. An arrow goes quiet at its end
 * of the row, and both hide when every card already fits. It also moves by itself, one card every few seconds,
 * and starts again from the first card after the last. It waits while the visitor is pointing at it, touching
 * it or tabbing through it, while it is off the screen, and for anyone who has asked for less motion.
 */
const EVERY = 3500;
export function CardCarousel({ label, children }: { label: string; children: React.ReactNode }) {
  const row = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState({ start: true, end: false });
  const held = useRef(false);
  const hold = (on: boolean) => () => { held.current = on; };

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const read = () => setAt({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
    read();
    el.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => { el.removeEventListener("scroll", read); window.removeEventListener("resize", read); };
  }, []);

  const move = (dir: 1 | -1) => {
    const el = row.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (el && card) el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: "smooth" });
  };

  useEffect(() => {
    const el = row.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let seen = false;
    const watch = new IntersectionObserver(([e]) => { seen = e.isIntersecting; }, { threshold: 0.5 });
    watch.observe(el);
    const timer = window.setInterval(() => {
      if (held.current || !seen || document.hidden || el.scrollWidth <= el.clientWidth + 2) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) el.scrollTo({ left: 0, behavior: "smooth" });
      else move(1);
    }, EVERY);
    return () => { window.clearInterval(timer); watch.disconnect(); };
  }, []);

  const arrow = "flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0F5B3E] transition-opacity disabled:opacity-35";

  return (
    <div className="flex flex-col gap-4" onMouseEnter={hold(true)} onMouseLeave={hold(false)} onFocus={hold(true)} onBlur={hold(false)} onTouchStart={hold(true)} onTouchEnd={() => window.setTimeout(hold(false), EVERY)}>
      <ul ref={row} aria-label={label} className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-px-5 px-5 sm:scroll-px-8 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden [&>li]:w-[78%] [&>li]:shrink-0 [&>li]:snap-center sm:[&>li]:w-[44%] sm:[&>li]:snap-start lg:[&>li]:w-[31%]">
        {children}
      </ul>
      {at.start && at.end ? null : (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => move(-1)} disabled={at.start} aria-label="Previous" className={arrow}><ArrowLeft aria-hidden className="h-5 w-5" /></button>
          <button type="button" onClick={() => move(1)} disabled={at.end} aria-label="Next" className={arrow}><ArrowRight aria-hidden className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  );
}

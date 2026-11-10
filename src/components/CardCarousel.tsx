"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * A row of cards that slides sideways: swipe on a phone, the two arrow buttons anywhere. The cards come from
 * the server as children (each an <li>), so this file holds only the scrolling. An arrow goes quiet at its end
 * of the row, and both hide when every card already fits.
 */
export function CardCarousel({ label, children }: { label: string; children: React.ReactNode }) {
  const row = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState({ start: true, end: false });

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
  const arrow = "flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0F5B3E] transition-opacity disabled:opacity-35";

  return (
    <div className="flex flex-col gap-4">
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

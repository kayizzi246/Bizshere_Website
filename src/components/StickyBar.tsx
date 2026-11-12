"use client";

import { useEffect, useRef } from "react";

/**
 * A bar that sticks under the menu bar once it is scrolled up to it (client, 12 Nov 2026: the steps bar on a
 * business idea page). While it is stuck it gets data-stuck, and turns navy with the hero's specks (globals.css,
 * [data-sticky-bar-steps]). A one-pixel marker just above it tells when it has reached the top.
 */
export function StickyBar({ label, children }: { label: string; children: React.ReactNode }) {
  const mark = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    const m = mark.current, b = bar.current;
    if (!m || !b) return;
    // Stuck once the marker just above the bar has gone up past the bar's sticking point (which moves when the
    // menu bar slides away), checked once a frame while scrolling
    let frame = 0;
    const check = () => {
      frame = 0;
      const top = parseFloat(getComputedStyle(b).top) || 0;
      if (m.getBoundingClientRect().top < top - 1) b.setAttribute("data-stuck", "");
      else b.removeAttribute("data-stuck");
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return (
    <>
      <span ref={mark} aria-hidden className="block h-px" />
      <nav ref={bar} aria-label={label} data-sticky-bar-steps="" className="group/bar sticky z-30 border-b border-line bg-white">
        {children}
      </nav>
    </>
  );
}

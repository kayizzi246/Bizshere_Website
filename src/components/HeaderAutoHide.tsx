"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * The site header (SiteHeader, [data-site-header]) slides away while the visitor scrolls down and comes
 * back as soon as they scroll up, so the page gets the whole screen. Not on the homepage: there it stays. It always shows near the top of the
 * page, while the phone menu is open, and while anything in the header has keyboard focus. The motion
 * itself is in globals.css ([data-site-header][data-hidden]); with less motion it simply appears.
 */
const TOP = 120; // px from the top where the header always shows
const NUDGE = 8; // px of scrolling that counts as a change of direction

export function HeaderAutoHide() {
  const path = usePathname();

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-site-header]");
    if (!header) return;
    let last = window.scrollY;
    let frame = 0;
    const show = () => header.removeAttribute("data-hidden");
    // The homepage keeps its header in view all the way down (client, 11 Nov 2026)
    if (path === "/") return show();
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      // The phone menu is open, or a keyboard user is moving through the header (a clicked link keeps
      // focus too, but only keyboard focus shows a ring, so only that keeps the header in place)
      const busy = Boolean(header.querySelector("details[open]") || header.querySelector(":focus-visible"));
      if (y < TOP || busy) { show(); last = y; return; }
      if (y > last + NUDGE) header.setAttribute("data-hidden", "");
      else if (y < last - NUDGE) show();
      else return;
      last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    show();
    window.addEventListener("scroll", onScroll, { passive: true });
    // Tabbing into a hidden header brings it back
    const onFocus = () => { if (header.querySelector(":focus-visible")) show(); };
    header.addEventListener("focusin", onFocus);
    return () => { window.removeEventListener("scroll", onScroll); header.removeEventListener("focusin", onFocus); cancelAnimationFrame(frame); show(); };
  }, [path]);

  return null;
}

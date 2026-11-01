"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

let lenis: Lenis | null = null;

/**
 * Smooth, eased scrolling for the public site (Lenis). Mouse wheel and trackpad
 * glide instead of jumping; touch scrolling stays native, so phones feel the same.
 *
 * Skipped entirely for visitors who ask for reduced motion. Scrollable panels
 * (menus, pop-ups, tables) keep their own scrolling, and the page pauses while
 * one has locked it. Add `data-lenis-prevent` to anything else that should opt out.
 */
export function SmoothScroll() {
  const path = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      allowNestedScroll: true,
      // In-page links (#directories, #cookies) glide too, clearing the fixed header.
      anchors: { offset: -96 },
    });
    // Pop-ups and menus lock the page with body overflow: hidden. Pause while they are open,
    // or the wheel would still move the page behind them.
    const lock = new MutationObserver(() => {
      if (document.body.style.overflow === "hidden") lenis?.stop(); else lenis?.start();
    });
    lock.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    return () => { lock.disconnect(); lenis?.destroy(); lenis = null; };
  }, []);

  // A new page starts at the top, without a long glide back up from the old position.
  useEffect(() => {
    if (!window.location.hash) lenis?.scrollTo(0, { immediate: true });
  }, [path]);

  return null;
}

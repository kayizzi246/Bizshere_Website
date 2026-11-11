"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { scrollToTop } from "./SmoothScroll";
import { usePathname } from "next/navigation";

/**
 * Scroll animations for the public site, with no wrappers in the page markup:
 *
 *   data-reveal              fades and rises into view the first time it scrolls on screen.
 *                            style={{ "--d": "120ms" }} staggers it.
 *   data-reveal-late         with data-reveal: a surprise. Stays hidden, even on screen, until the visitor
 *                            has scrolled and it is well in view; anything data-reveal inside it waits too.
 *   data-count="42"          counts up from 0 to 42 when it comes into view.
 *
 * Plus a thin reading-progress bar under the header, and a Back to top button once the visitor is well
 * down a long page (bottom-left on phones, above the chat button on computers: [data-top-btn] in globals.css).
 *
 * Content below the fold is only hidden once this component has mounted (the
 * `reveal-ready` class on <html>), and nothing moves for visitors who ask for
 * reduced motion (see globals.css).
 */
export function ScrollEffects() {
  const path = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const [far, setFar] = useState(false);

  // Reveal and count-up. A page's content can arrive after the address changes (it streams in behind
  // the loading screen), so new elements are watched for rather than looked for once: an element
  // that was never seen here would stay hidden for good.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const watch = !reduce && "IntersectionObserver" in window;
    const show = (el: HTMLElement) => {
      if (el.hasAttribute("data-reveal")) {
        el.setAttribute("data-shown", "");
        // Hand the element back to its own hover transitions once it has arrived.
        const delay = parseInt(getComputedStyle(el).getPropertyValue("--d")) || 0;
        window.setTimeout(() => el.setAttribute("data-done", ""), reduce ? 0 : 800 + delay);
      }
      if (el.dataset.count && !el.hasAttribute("data-counted")) countUp(el, reduce);
    };
    const io = watch ? new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { show(e.target as HTMLElement); io?.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }) : null;

    // Only after a real scroll, so a tall screen doesn't give the surprise away on arrival.
    const late = () => {
      if (!io || window.scrollY < 40) return;
      for (const el of document.querySelectorAll<HTMLElement>("[data-reveal-late]:not([data-shown]), [data-reveal-late] [data-reveal]:not([data-shown])")) {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.8) show(el);
      }
    };

    const seen = new WeakSet<Element>();
    const scan = () => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown]), [data-count]:not([data-counted])")) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (!io) show(el);
        else if (el.closest("[data-reveal-late]")) continue;
        // Anything already on screen, or scrolled past, is shown at once (no flash, no wait).
        else if (el.getBoundingClientRect().top < window.innerHeight) {
          if (el.hasAttribute("data-reveal")) {
            el.setAttribute("data-shown", "");
            el.setAttribute("data-done", "");
          }
          if (el.dataset.count) countUp(el, reduce);
        } else io.observe(el);
      }
      late();
    };
    scan();
    window.addEventListener("scroll", late, { passive: true });
    // Only content further down is hidden, and only from this point on (`reveal-ready`), so a
    // script that never runs can never leave the page blank.
    if (watch) document.documentElement.classList.add("reveal-ready");
    let frame = 0; // runs before the next paint, so new content never flashes
    const mo = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; scan(); }); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io?.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", late); };
  }, []);

  // Reading progress
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
      // Back to top: only on a long page, once well down it
      setFar(window.scrollY > window.innerHeight * 1.5);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, [path]);

  return (
    <>
      <div ref={bar} aria-hidden className="scroll-progress" />
      <button type="button" data-chrome="" data-top-btn="" onClick={scrollToTop} aria-label="Back to top" tabIndex={far ? 0 : -1}
        className={`fixed left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-heading shadow-[0_4px_14px_rgba(7,26,51,0.18)] transition-[opacity,transform] duration-300 hover:border-brand hover:text-brand lg:left-auto lg:right-5 ${far ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
        <ArrowUp aria-hidden className="h-5 w-5" />
      </button>
    </>
  );
}

function countUp(el: HTMLElement, reduce: boolean) {
  el.setAttribute("data-counted", "");
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target) || reduce || target === 0) { el.textContent = target.toLocaleString("en-GB"); return; }
  const start = performance.now();
  const ms = Math.min(1600, 600 + target * 40);
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased).toLocaleString("en-GB");
    if (t < 1) requestAnimationFrame(tick);
  };
  el.textContent = "0";
  requestAnimationFrame(tick);
}

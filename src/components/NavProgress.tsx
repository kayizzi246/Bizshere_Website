"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin progress bar across the top of the screen while the next page loads.
 * Starts on any click on an internal link (or a form submit that navigates), creeps
 * towards 90%, and finishes when the new address is shown.
 */
export function NavProgress() {
  const path = usePathname();
  const query = useSearchParams().toString();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const first = useRef(true);

  const start = () => {
    if (timer.current) clearInterval(timer.current);
    setVisible(true);
    setWidth(12);
    timer.current = setInterval(() => setWidth((w) => (w < 90 ? w + (90 - w) * 0.12 : w)), 200);
  };

  // New address: finish the bar, then fade it out.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (timer.current) clearInterval(timer.current);
    setWidth(100);
    const t = setTimeout(() => { setVisible(false); setWidth(0); }, 300);
    return () => clearTimeout(t);
  }, [path, query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-onboard")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || /\/(export|api)\//.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!e.defaultPrevented && (form.method || "get").toLowerCase() === "get") start();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("submit", onSubmit); if (timer.current) clearInterval(timer.current); };
  }, []);

  return (
    <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="h-full bg-gradient-to-r from-accent to-brand shadow-[0_0_8px_rgba(254,131,2,0.6)] transition-[width] duration-200 ease-out" style={{ width: `${width}%` }} />
    </div>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The result of a save, brought into view: the page can come back well away from it, and a message
 * nobody sees looks like nothing happened. With `next`, the cursor waits in the first box of the form
 * below it, ready for the next one.
 */
export function SaveNotice({ bad, next, children }: { bad: boolean; next: boolean; children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    // After the browser has finished jumping to the section
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ block: "start" });
      if (next) ref.current?.nextElementSibling?.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [next]);
  return (
    <p ref={ref} role={bad ? "alert" : "status"} className={`scroll-mt-24 rounded-xl p-3 text-sm font-bold ${bad ? "bg-bad-bg text-bad-fg" : "bg-brand-tint text-brand-dark"}`}>
      {children}
    </p>
  );
}

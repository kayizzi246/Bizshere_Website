"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * The phone menu: a <details> dropdown (so it still opens without JavaScript) that also closes
 * on a tap outside it, on Escape, when a link inside is tapped, and after navigating.
 */
export function MobileMenu({ summary, children, className = "lg:hidden" }: { summary: React.ReactNode; children: React.ReactNode; /** Where it shows (the header's More menu: wide screens only) */ className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();

  useEffect(() => { ref.current?.removeAttribute("open"); }, [path]);

  useEffect(() => {
    const close = () => ref.current?.removeAttribute("open");
    const onPointer = (e: PointerEvent) => { if (ref.current?.open && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <details ref={ref} className={`group relative ${className}`}
      onClick={(e) => { if ((e.target as HTMLElement).closest("a")) ref.current?.removeAttribute("open"); }}>
      {summary}
      {children}
    </details>
  );
}

"use client";

import { usePathname } from "next/navigation";

/** Renders its children everywhere except the homepage (e.g. the header's sign-up button). */
export function HideOnHome({ children }: { children: React.ReactNode }) {
  return usePathname() === "/" ? null : <>{children}</>;
}

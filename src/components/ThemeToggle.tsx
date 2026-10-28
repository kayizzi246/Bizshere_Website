"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * One-tap light/dark switch for the admin. Flips `.theme-dark` on the admin shell
 * (#admin-shell) and remembers the choice in a cookie, so the next page loads in
 * the same theme without a flash.
 */
export function ThemeToggle({ initial, withLabel = false }: { initial: "light" | "dark"; withLabel?: boolean }) {
  const [theme, setTheme] = useState(initial);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.getElementById("admin-shell")?.classList.toggle("theme-dark", next === "dark");
    document.cookie = `admin-theme=${next}; path=/; max-age=31536000; samesite=lax`;
  };
  const dark = theme === "dark";
  return (
    <button type="button" onClick={flip} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}
      className={withLabel
        ? "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-white/70 hover:bg-white/[0.06] hover:text-white"
        : "flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-heading hover:border-brand hover:text-brand"}>
      {dark ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
      {withLabel ? <span>{dark ? "Light mode" : "Dark mode"}</span> : null}
    </button>
  );
}

"use client";

import { useEffect } from "react";

/**
 * The steps on a business idea page start closed (client, 12 Nov 2026). Going to one, from the steps bar, a
 * "See the start-up budget below" link or an address ending in #budget, opens it: the <details> inside the
 * section with that id.
 */
export function OpenOnHash() {
  useEffect(() => {
    const open = (hash: string) => {
      const id = decodeURIComponent(hash.replace(/^#/, ""));
      if (!id) return;
      const d = document.getElementById(id)?.querySelector("details");
      if (d && !d.open) d.open = true;
    };
    open(location.hash);
    const onHash = () => open(location.hash);
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>("a[href*='#']");
      if (!a) return;
      const url = new URL(a.href, location.href);
      if (url.pathname === location.pathname) open(url.hash);
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("hashchange", onHash); document.removeEventListener("click", onClick, true); };
  }, []);
  return null;
}

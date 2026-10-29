"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const COOKIE = "cookie-notice";

/**
 * Small card in the bottom-left corner until the visitor accepts or closes it. Either choice is
 * remembered for a year in the `cookie-notice` cookie. The site sets only the cookies it needs
 * (listed on the privacy page), so there is nothing to switch off: "Manage cookies" explains them.
 * Shown only after mounting, so the server-rendered page never flashes it for returning visitors.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(!document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`))); }, []);
  if (!show) return null;

  const done = (value: "accepted" | "dismissed") => {
    document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
    setShow(false);
  };

  return (
    <div role="region" aria-label="Cookie notice" className="onboard-pop fixed inset-x-3 bottom-3 z-[65] flex items-center gap-3 rounded-2xl border border-line bg-white py-3 pl-3 pr-3 shadow-[0_18px_50px_-12px_rgba(7,26,51,0.35)] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-[440px] sm:gap-4 sm:pl-4">
      <button type="button" onClick={() => done("dismissed")} aria-label="Close cookie notice" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink hover:bg-page"><X aria-hidden className="h-5 w-5" /></button>
      <p className="flex-1 text-[13px] leading-snug text-ink-soft">
        By continuing to use our website, you agree to our cookie policy and privacy policy.{" "}
        <Link href="/privacy#cookies" className="font-medium text-ink underline underline-offset-2 hover:text-brand">Manage cookies</Link>
      </p>
      <button type="button" onClick={() => done("accepted")} className="inline-flex h-11 shrink-0 items-center rounded-full bg-heading px-5 text-sm font-bold text-white hover:bg-brand">Accept</button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/**
 * "Share": the phone's own share sheet (WhatsApp, SMS, email…) where the browser has one, otherwise
 * a WhatsApp link with the page's address, and a copied link as the last resort. A member passing a
 * supplier or a machine on to a friend is the cheapest new visitor there is.
 */
export function ShareButton({ title, path, compact = false , small = false }: { title: string; path: string; compact?: boolean ; small?: boolean }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = `${location.origin}${path}`;
    const text = `${title} on BizSphere-Ug`;
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
    } catch { return; } // the person closed the share sheet
    const popup = window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank", "noopener,noreferrer");
    if (!popup) {
      try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* nothing to do */ }
    }
  };
  if (compact) {
    return (
      <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-white hover:text-white">
        {done ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Share2 aria-hidden className="h-3.5 w-3.5" />}{done ? "Link copied" : "Share"}
      </button>
    );
  }
  return (
    <button type="button" onClick={share} className={`inline-flex items-center justify-center gap-1.5 border border-line text-ink hover:border-brand hover:text-brand ${small ? "h-11 rounded-lg px-4 text-[14px] font-semibold" : "h-12 w-full rounded-xl text-sm font-bold"}`}>
      {done ? <Check aria-hidden className="h-4 w-4" /> : <Share2 aria-hidden className="h-4 w-4" />}{done ? "Link copied" : "Share"}
    </button>
  );
}

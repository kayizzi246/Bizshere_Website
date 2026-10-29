"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

/**
 * Shown inside the site's header and footer when a page fails on the server, instead of the bare
 * "Application error" screen. Most failures are passing (a database waking up), so "Try again"
 * reloads the page. The reference matches the "digest" in the hosting logs.
 */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container-site flex justify-center py-20">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand"><RotateCw aria-hidden className="h-6 w-6" /></span>
        <h1 className="font-sans text-2xl font-bold text-heading">This page didn&apos;t load</h1>
        <p className="text-[15px] leading-relaxed text-ink-muted">Something went wrong on our side. It usually works on a second try.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary min-h-[48px] px-6">Try again</button>
          <Link href="/" className="btn-outline min-h-[48px] px-6">Go to the homepage</Link>
        </div>
        {error.digest ? <p className="text-xs text-ink-muted">Reference: {error.digest}</p> : null}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

/**
 * Shown inside the admin (menu still there) when an admin page or a save fails on the server.
 * Without it the failure reached the site's last-resort screen, which replaces everything
 * ("BizSphere-Ug didn't load", adding a funding source, 9 Nov 2026). Almost every failure is a
 * passing database hiccup, so "Try again" usually works. The reference matches the hosting logs.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex justify-center py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand"><RotateCw aria-hidden className="h-6 w-6" /></span>
        <h1 className="font-display text-2xl font-extrabold text-heading">That didn&apos;t go through</h1>
        <p className="text-[15px] leading-relaxed text-ink-muted">The connection to the database dropped for a moment. Press Try again. If you were saving, check the list first: it may already be saved.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className="btn-primary min-h-[48px] px-6">Try again</button>
          <Link href="/admin" className="btn-outline min-h-[48px] px-6">Back to the dashboard</Link>
        </div>
        {error.digest ? <p className="text-xs text-ink-muted">Reference: {error.digest}</p> : null}
      </div>
    </div>
  );
}

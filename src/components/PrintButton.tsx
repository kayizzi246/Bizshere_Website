"use client";

import { Printer } from "lucide-react";

/** Opens the browser's print dialog (also "Save as PDF"). */
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-line-strong bg-white px-5 text-sm font-bold text-ink hover:border-ink">
      <Printer aria-hidden className="h-4 w-4" /> {label}
    </button>
  );
}

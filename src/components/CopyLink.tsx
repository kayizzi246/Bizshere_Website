"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** A sign-in address with a "Copy" button, for the admin to send to a seller or expert. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border border-line bg-page py-1 pl-2.5 pr-1 text-[13px]">
      <a href={url} target="_blank" rel="noopener noreferrer" className="truncate font-semibold">{url.replace(/^https?:\/\//, "")}</a>
      <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold text-brand hover:bg-brand-tint">
        {copied ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

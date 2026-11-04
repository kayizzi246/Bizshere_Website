"use client";

import { useEffect } from "react";
import type { Settled } from "@/lib/membership";

/** Tells the pop-up the payment page is done. Opened on its own (no pop-up), it carries on to the account page. */
export function ReturnNotice({ status }: { status: Settled }) {
  useEffect(() => {
    if (window.parent !== window) window.parent.postMessage({ type: "bizsphere:payment", status }, window.location.origin);
    else window.location.replace(status === "SUCCEEDED" ? "/account?welcome=1#membership" : "/account#membership");
  }, [status]);

  const paid = status === "SUCCEEDED";
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      {paid || status === "PENDING" ? (
        <span aria-hidden className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
      ) : null}
      <p className="font-display text-xl font-extrabold text-heading">
        {paid ? "Payment received" : status === "PENDING" ? "Confirming your payment…" : "The payment didn't go through"}
      </p>
      <p className="text-sm text-ink-muted">{paid ? "Opening your full access…" : status === "PENDING" ? "This takes a few seconds." : "No money was taken. You can try again."}</p>
    </div>
  );
}

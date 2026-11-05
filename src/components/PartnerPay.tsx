"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { cancelPayment, checkPayment } from "@/app/actions/onboarding";
import { startPartnerPayment } from "@/app/actions/partners";
import type { PartnerKind } from "@/lib/membership";

type Option = { period: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"; label: string; price: string };

/**
 * A supplier's or expert's listing payment, in a pop-up that opens by itself after registering (and
 * whenever they come back unpaid): choose how long, then pay on Pesapal's page in the same pop-up. It
 * closes only with its own button, as in the member pop-up (src/components/Onboarding.tsx), and the
 * button left on the page opens it again. The order is checked every 4 seconds and when the return
 * page says it's done; the server decides.
 */
export function PartnerPay({ kind, options, done, title }: { kind: PartnerKind; options: Option[]; done: string; title: string }) {
  const [open, setOpen] = useState(true);
  const [period, setPeriod] = useState<Option["period"]>(options.find((o) => o.period === "MONTHLY")?.period ?? options[0]?.period ?? "MONTHLY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<{ url: string; paymentId: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const finished = useRef(false);

  const paid = useCallback(() => { finished.current = true; window.location.assign(done); }, [done]);

  const settle = useCallback(async (paymentId: string) => {
    const s = await checkPayment(paymentId).catch(() => "PENDING" as const);
    if (s === "SUCCEEDED") { paid(); return true; }
    if (s === "FAILED") setFailed(true); // Pesapal's page stays open to try again on the same order
    if (s === "CANCELLED" || s === "REFUNDED") {
      setOrder(null);
      setError("The payment didn't go through and no money was taken. Please try again.");
      return true;
    }
    return false;
  }, [paid]);

  useEffect(() => {
    if (!order) return;
    let tries = 0;
    const t = setInterval(async () => {
      tries += 1;
      if (tries > 150 || (await settle(order.paymentId))) clearInterval(t);
    }, 4000);
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "bizsphere:payment") return;
      void settle(order.paymentId).then((over) => { if (over) clearInterval(t); });
    };
    window.addEventListener("message", onMessage);
    return () => { clearInterval(t); window.removeEventListener("message", onMessage); };
  }, [order, settle]);

  async function start() {
    setBusy(true);
    setError(null);
    setFailed(false);
    const res = await startPartnerPayment({ kind, period }).catch(() => ({ status: "error", message: "Something went wrong. Please try again." }) as const);
    setBusy(false);
    if (res.status === "active") paid();
    else if (res.status === "checkout") setOrder({ url: res.url, paymentId: res.paymentId });
    else setError(res.message);
  }

  async function close() {
    const id = order?.paymentId;
    setOrder(null);
    setOpen(false);
    // Paid in the meantime: it still counts
    if (id && (await cancelPayment(id).catch(() => null)) === "SUCCEEDED") paid();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary min-h-[48px] w-full rounded-xl text-[15px] font-bold">Choose a plan and pay</button>

      {open ? (
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-3">
          <div className={`onboard-pop flex w-full flex-col overflow-hidden rounded-3xl bg-white ${order ? "h-[min(680px,92dvh)] max-w-lg" : "max-h-[92dvh] max-w-md"}`}>
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <span className="min-w-0 truncate font-display text-[16px] font-extrabold text-heading">{order ? "Secure payment" : title}</span>
              <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-line hover:ring-brand"><X aria-hidden className="h-4 w-4" /></button>
            </div>

            {order ? (
              <>
                {failed ? <p className="bg-accent-tint px-4 py-2 text-[13px] font-semibold text-accent-dark">That attempt didn&apos;t go through. You can try again below.</p> : null}
                <iframe src={order.url} title="Pesapal secure payment" allow="payment" className="min-h-0 w-full flex-1 border-0" />
              </>
            ) : options.length ? (
              <div className="flex flex-col gap-3 overflow-y-auto p-5">
                <p className="text-[14px] text-ink-muted">Your details are saved. Choose how long to list your page.</p>
                <div role="radiogroup" aria-label="How long" className="flex flex-col gap-2">
                  {options.map((o) => {
                    const on = o.period === period;
                    return (
                      <button key={o.period} type="button" role="radio" aria-checked={on} onClick={() => setPeriod(o.period)}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left ring-1 transition-colors ${on ? "bg-brand-tint ring-brand" : "bg-white ring-line hover:ring-brand/40"}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${on ? "bg-brand text-white" : "ring-1 ring-line-strong"}`}>{on ? <Check aria-hidden className="h-3 w-3" strokeWidth={3} /> : null}</span>
                        <span className="flex-1 text-[15px] font-semibold text-heading">{o.label}</span>
                        <span className="text-[15px] font-bold tabular-nums text-heading">{o.price}</span>
                      </button>
                    );
                  })}
                </div>
                {error ? <p role="alert" className="rounded-lg bg-bad-bg px-3 py-2 text-[14px] font-semibold text-bad-fg">{error}</p> : null}
                <button type="button" onClick={start} disabled={busy} className="btn-primary min-h-[48px] w-full rounded-xl text-[15px] font-bold">
                  {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}Pay now
                </button>
                <p className="text-center text-[13px] text-ink-muted">MTN MoMo, Airtel Money, Visa or Mastercard, by Pesapal.</p>
              </div>
            ) : (
              <p className="p-5 text-[14px] font-semibold text-ink-soft">Prices are coming soon. Your details are saved, and you can pay here once they&apos;re set.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

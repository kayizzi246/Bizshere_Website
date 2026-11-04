"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, MapPin, X } from "lucide-react";

/** `locked`: this market's price is member detail (a visitor picked a market beyond the free preview). */
export type BoardRow = { id: string; name: string; initial: string; tone: string; sub: string; price: string | null; change: number | null; locked?: boolean };
export type MarketPrice = { id: string; market: string; place: string; observed: string; range: string; stale: boolean };

/**
 * The price board's list (src/app/(site)/prices/page.tsx). Tapping a product opens a pop-up:
 * members get that product's latest price in every market; everyone else gets the sign-up and
 * payment pop-up (a data-pay link, caught by the site-wide OnboardingGate), like every other
 * directory item. `details` is only sent for members, so visitors never receive market prices.
 */
export function PriceBoard({ rows, details, unitLabel }: { rows: BoardRow[]; details: Record<string, MarketPrice[]> | null; unitLabel: string }) {
  const [open, setOpen] = useState<BoardRow | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const rowCls = "flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left text-white transition-colors hover:bg-white/[0.06] hover:text-white sm:gap-4 sm:px-3 sm:py-3.5";
  const body = (r: BoardRow) => {
    const up = (r.change ?? 0) > 0, down = (r.change ?? 0) < 0;
    return (
      <>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white sm:h-10 sm:w-10 ${r.tone}`}>{r.initial}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-display text-[17px] font-semibold sm:text-[22px]">{r.name}</span>
          <span className="truncate text-[12px] text-white/45">{r.sub}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="font-display text-[16px] font-semibold tabular-nums sm:text-[22px]">{r.price ?? (r.locked ? <span className="text-[13px] font-semibold text-accent sm:text-[15px]">Members only</span> : <span className="text-white/40">No price yet</span>)}</span>
          <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold tabular-nums sm:text-[13px] ${up ? "text-[#27AD75]" : down ? "text-[#F0616D]" : "text-white/35"}`}>
            {up ? <ArrowUpRight aria-hidden className="h-3.5 w-3.5" /> : down ? <ArrowDownLeft aria-hidden className="h-3.5 w-3.5" /> : null}
            {r.change === null ? "--" : `${Math.abs(r.change).toFixed(2)}%`}
            <span className="sr-only">{up ? "up" : down ? "down" : ""} since the previous price</span>
          </span>
        </span>
      </>
    );
  };

  return (
    <>
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.id}>
            {details ? (
              <button type="button" onClick={() => setOpen(r)} className={rowCls}>{body(r)}</button>
            ) : (
              <a href="/membership?onboard=pay&next=%2Fprices" data-pay="" data-next="/prices" className={rowCls}>{body(r)}</a>
            )}
          </li>
        ))}
      </ul>

      {open && details ? (
        <div role="dialog" aria-modal="true" aria-labelledby="price-title" onClick={() => setOpen(null)}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div onClick={(e) => e.stopPropagation()} className="onboard-pop flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#0A0B0D] text-white sm:rounded-3xl">
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${open.tone}`}>{open.initial}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span id="price-title" className="truncate font-display text-lg font-bold">{open.name}</span>
                <span className="text-[12px] text-white/50">{unitLabel} · {open.sub}</span>
              </span>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
            </div>
            <ul className="flex flex-col gap-1 overflow-y-auto p-2">
              {(details[open.id] ?? []).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04]">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{m.market}</span>
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-white/50">
                      <span className="inline-flex items-center gap-1"><MapPin aria-hidden className="h-3 w-3" />{m.place}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden className="h-3 w-3" />{m.observed}</span>
                      {m.stale ? <span className="rounded-full bg-[#F0616D]/15 px-2 py-px text-[11px] font-semibold text-[#F0616D]">May be out of date</span> : null}
                    </span>
                  </span>
                  <span className="shrink-0 text-right font-display text-[15px] font-semibold tabular-nums">{m.range}</span>
                </li>
              ))}
              {!(details[open.id] ?? []).length ? <li className="px-3 py-8 text-center text-sm text-white/50">No published prices for this product yet.</li> : null}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, LockKeyhole, MapPin, X } from "lucide-react";

/** One price cell: the price as text, or `locked` (member detail: a market beyond the visitor's free preview). */
export type BoardPrice = { value: string | null; locked: boolean };
export type BoardRow = {
  id: string; name: string; initial: string; tone: string;
  /** "per kg · Wholesale · 3 markets": the heading of the members' pop-up */
  sub: string;
  /** Where the Supplier link goes. Members get the address; for visitors it is never sent. */
  supplier: { href: string | null };
  price: BoardPrice;
  /** What the price is for, e.g. "kg" or "50 kg bag". */
  unit: string | null;
  change: number | null;
  updated: string | null;
};
export type MarketPrice = { id: string; market: string; place: string; type: string; observed: string; range: string; stale: boolean };

// Product on the left, one price column on the right, the same in the header and every row.
const GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4";

/**
 * The price table (src/app/(site)/prices/page.tsx): one row per product, with one price column:
 * the price, and under it the change and when it was last updated. Tapping a product opens a pop-up: members get
 * its latest price in every market; everyone else gets the sign-up and payment pop-up (a data-pay
 * link, caught by the site-wide OnboardingGate). `details` is only sent for members, so visitors
 * never receive market prices. Under the name is the Supplier link, which is not free: members go to
 * the supplier, everyone else to the same pop-up. The row's own link lies behind it, so the two
 * are not nested.
 */
export function PriceBoard({ rows, details }: { rows: BoardRow[]; details: Record<string, MarketPrice[]> | null }) {
  const [open, setOpen] = useState<BoardRow | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const cell = (p: BoardPrice, unit: string | null) => p.value
    ? <span className="font-display text-[17px] font-semibold tabular-nums text-white sm:text-[20px]">{p.value}{unit ? <span className="ml-1 font-sans text-[13px] font-medium text-white/60">/{unit}</span> : null}</span>
    : p.locked
      ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent"><LockKeyhole aria-hidden className="h-3 w-3" />Members</span>
      : <span className="text-[13px] text-white/30">—</span>;

  const change = (c: number | null) => {
    const up = (c ?? 0) > 0, down = (c ?? 0) < 0;
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${up ? "bg-[#27AD75]/15 text-[#27AD75]" : down ? "bg-[#F0616D]/15 text-[#F0616D]" : "text-white/35"}`}>
        {up ? <ArrowUpRight aria-hidden className="h-3.5 w-3.5" /> : down ? <ArrowDownLeft aria-hidden className="h-3.5 w-3.5" /> : null}
        {c === null ? "--" : `${Math.abs(c).toFixed(1)}%`}
        <span className="sr-only">{up ? "up" : down ? "down" : ""} since the previous price</span>
      </span>
    );
  };

  const body = (r: BoardRow) => (
    <>
      {/* Product */}
      <span className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white ${r.tone}`}>{r.initial}</span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-[16px] font-semibold sm:text-[18px]">{r.name}</span>
          {r.supplier.href ? (
            <a href={r.supplier.href} className="relative z-10 w-fit py-0.5 text-[13px] font-semibold text-accent hover:text-white">Supplier</a>
          ) : (
            <a href="/membership?onboard=pay&next=%2Fprices" data-pay="" data-next="/prices" className="relative z-10 inline-flex w-fit items-center gap-1 py-0.5 text-[13px] font-semibold text-accent hover:text-white"><LockKeyhole aria-hidden className="h-3 w-3" />Supplier</a>
          )}
        </span>
      </span>
      {/* Price: the price, then the change and the date under it */}
      <span className="flex flex-col items-end gap-1 text-right">
        {cell(r.price, r.unit)}
        <span className="flex items-center gap-2">
          {change(r.change)}
          {r.updated ? <span className="hidden text-[11px] text-white/45 sm:inline">{r.updated}</span> : null}
        </span>
      </span>
    </>
  );

  const rowCls = `relative w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-left text-white transition-colors hover:border-white/15 hover:bg-white/[0.06] hover:text-white sm:px-4 ${GRID}`;

  return (
    <>
      <div role="table" aria-label="Prices" className="flex flex-col gap-2">
        <div role="row" className={`px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40 ${GRID}`}>
          <span role="columnheader">Product</span>
          <span role="columnheader" className="text-right">Price</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} role="row" className={rowCls}>
            {details ? (
              <button type="button" onClick={() => setOpen(r)} aria-label={`${r.name}: prices in every market`} className="absolute inset-0 rounded-2xl" />
            ) : (
              <a href="/membership?onboard=pay&next=%2Fprices" data-pay="" data-next="/prices" aria-label={`${r.name}: see every market`} className="absolute inset-0 rounded-2xl" />
            )}
            {body(r)}
          </div>
        ))}
      </div>

      {open && details ? (
        <div role="dialog" aria-modal="true" aria-labelledby="price-title" onClick={() => setOpen(null)}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
          <div onClick={(e) => e.stopPropagation()} className="onboard-pop flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#0A0B0D] text-white sm:rounded-3xl">
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${open.tone}`}>{open.initial}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span id="price-title" className="truncate font-display text-lg font-bold">{open.name}</span>
                <span className="text-[12px] text-white/50">{open.sub}</span>
              </span>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-4 w-4" /></button>
            </div>
            <ul className="flex flex-col gap-1 overflow-y-auto p-2">
              {(details[open.id] ?? []).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.04]">
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{m.market}</span>
                      <span className="shrink-0 rounded-full bg-white/10 px-2 py-px text-[11px] font-semibold text-white/70">{m.type}</span>
                    </span>
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

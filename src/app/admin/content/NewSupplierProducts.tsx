"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ProductPhotos } from "@/components/ProductPhotos";

type Row = { key: number; images: string[] };

/**
 * Products on the New supplier form (client, 11 Nov 2026: "add where I can add products for the supplier"):
 * a few simple rows — name, price, pack — each with its own photo gallery underneath (client, 14 Nov 2026),
 * so one product can carry several pictures. The photos are sent as one JSON list per row (np_images), which
 * keeps them lined up with the other columns; src/app/admin/content/actions.ts saves the first as the main
 * photo and the rest as the gallery. Everything is optional; a row with no name is skipped.
 */
export function NewSupplierProducts() {
  const next = useRef(3);
  const [rows, setRows] = useState<Row[]>([0, 1, 2].map((key) => ({ key, images: [] })));
  const set = (key: number, images: string[]) => setRows((all) => all.map((r) => (r.key === key ? { ...r, images } : r)));

  const box = "input min-h-[44px] w-full min-w-0";
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
        {rows.map((r, n) => (
          <li key={r.key} className="flex flex-col gap-3 rounded-xl border border-line p-3">
            {/* One list per row, in the same order as the names, so the server can pair them up */}
            <input type="hidden" name="np_images" value={JSON.stringify(r.images)} />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <input name="np_name" aria-label={`Product ${n + 1}: name`} placeholder={n === 0 ? "Product name, e.g. Wheat flour" : "Product name"} maxLength={200} className={box} />
                <input name="np_price" aria-label={`Product ${n + 1}: price in UGX`} placeholder="Price (UGX)" inputMode="numeric" className={box} />
                <input name="np_unit" aria-label={`Product ${n + 1}: pack or unit`} placeholder="Pack, e.g. 50 kg bag" maxLength={100} className={box} />
              </div>
              {rows.length > 1 ? (
                <button type="button" onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} aria-label={`Remove product ${n + 1}`} className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-lg text-ink-muted hover:bg-bad-bg hover:text-bad-fg sm:self-auto"><Trash2 aria-hidden className="h-4 w-4" /></button>
              ) : null}
            </div>

            {/* The product's own gallery, under its row: add several at once, pick which one is the main photo */}
            <div className="border-t border-line pt-3">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">Photos of product {n + 1}</span>
              <ProductPhotos initial={r.images} onChange={(images) => set(r.key, images)} />
            </div>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setRows((all) => [...all, { key: next.current++, images: [] }])} className="btn-outline w-fit gap-1.5 text-sm"><Plus aria-hidden className="h-4 w-4" />Add another product</button>
      <p className="text-xs text-ink-muted">Leave a row empty to skip it. The price can be left empty. After you save, you can add more details to each product, or add many at once, in the Products window on the supplier&apos;s page.</p>
    </div>
  );
}

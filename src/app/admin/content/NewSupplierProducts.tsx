"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { uploadFile } from "@/components/UploadButton";

type Row = { key: number; image: string; busy: boolean; error: string };

/**
 * Products on the New supplier form (client, 11 Nov 2026: "add where I can add products for the supplier"):
 * a few simple rows, name, price, pack and a photo, sent with the form and saved with the supplier
 * (src/app/admin/content/actions.ts reads the np_* fields). Everything is optional; a row with no name is
 * skipped. After saving, the supplier's page has the full products window for more detail and bulk work.
 */
export function NewSupplierProducts() {
  const next = useRef(3);
  const [rows, setRows] = useState<Row[]>([0, 1, 2].map((key) => ({ key, image: "", busy: false, error: "" })));
  const set = (key: number, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const pick = async (key: number, file?: File) => {
    if (!file) return;
    set(key, { busy: true, error: "" });
    try { set(key, { image: await uploadFile(file, "image"), busy: false }); }
    catch (e) { set(key, { busy: false, error: (e as Error).message }); }
  };

  const box = "input min-h-[44px] w-full min-w-0";
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
        {rows.map((r, n) => (
          <li key={r.key} className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center">
            <input type="hidden" name="np_image" value={r.image} />
            {/* The photo: tap the square to choose one */}
            <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line-strong bg-page text-ink-muted hover:border-brand hover:text-brand" title="Add a photo">
              {/* eslint-disable-next-line @next/next/no-img-element -- just uploaded */}
              {r.image ? <img src={r.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : r.busy ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : <ImageIcon aria-hidden className="h-5 w-5" />}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" aria-label={`Photo of product ${n + 1}`} onChange={(e) => pick(r.key, e.target.files?.[0])} />
            </label>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <input name="np_name" aria-label={`Product ${n + 1}: name`} placeholder={n === 0 ? "Product name, e.g. Wheat flour" : "Product name"} maxLength={200} className={box} />
              <input name="np_price" aria-label={`Product ${n + 1}: price in UGX`} placeholder="Price (UGX)" inputMode="numeric" className={box} />
              <input name="np_unit" aria-label={`Product ${n + 1}: pack or unit`} placeholder="Pack, e.g. 50 kg bag" maxLength={100} className={box} />
            </div>
            {rows.length > 1 ? (
              <button type="button" onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} aria-label={`Remove product ${n + 1}`} className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-lg text-ink-muted hover:bg-bad-bg hover:text-bad-fg sm:self-auto"><Trash2 aria-hidden className="h-4 w-4" /></button>
            ) : null}
            {r.error ? <span role="alert" className="basis-full text-xs font-semibold text-bad-fg">{r.error}</span> : null}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setRows((all) => [...all, { key: next.current++, image: "", busy: false, error: "" }])} className="btn-outline w-fit gap-1.5 text-sm"><Plus aria-hidden className="h-4 w-4" />Add another product</button>
      <p className="text-xs text-ink-muted">Leave a row empty to skip it. The price can be left empty. After you save, you can add more details to each product, or add many at once, in the Products window on the supplier&apos;s page.</p>
    </div>
  );
}

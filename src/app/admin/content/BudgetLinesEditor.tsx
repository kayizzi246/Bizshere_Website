"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

/** One start-up budget item as edited here and sent to saveBudgetScenario (as JSON in the "lines" field). */
export type BudgetRow = { category: string; item: string; qty: string; unit: string; price: string; reason: string; recurring: boolean; optional: boolean; details: string };

const CATEGORIES = ["Legal", "Documents", "Premises", "Equipment", "Software", "Stock", "Branding", "Operating expenses"];
const blank = (category = ""): BudgetRow => ({ category, item: "", qty: "1", unit: "", price: "", reason: "", recurring: false, optional: false, details: "" });
const num = (s: string) => {
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
};

/**
 * The template's start-up budget sub-table (Sn, Item, Qty, Price, Amount) as an editable grid:
 * the amount and total work themselves out, rows are added and removed in place, and rows copied
 * from Excel or Word (Item, Qty, Price; a leading Sn column is skipped) can be pasted into an Item
 * cell. Each row also takes a category, whether it is optional, and a short description.
 */
export function BudgetLinesEditor({ initial, currency }: { initial: BudgetRow[]; currency: string }) {
  const [rows, setRows] = useState<BudgetRow[]>(initial.length ? initial : [blank(), blank(), blank(), blank(), blank()]);
  const set = (i: number, patch: Partial<BudgetRow>) => setRows((r) => r.map((row, n) => (n === i ? { ...row, ...patch } : row)));
  const add = () => setRows((r) => [...r, blank(r.at(-1)?.category)]);
  const remove = (i: number) => setRows((r) => (r.length > 1 ? r.filter((_, n) => n !== i) : [blank()]));

  // Rows pasted from a spreadsheet or a Word table: tab-separated columns, one row per line.
  const paste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    const pasted = text.split(/\r?\n/).map((l) => l.split("\t").map((c) => c.trim())).filter((c) => c.some(Boolean)).map((cols) => {
      if (cols.length > 1 && /^\d+\.?$/.test(cols[0]) && cols[1] && !/^\d/.test(cols[1])) cols = cols.slice(1); // Sn column
      return { ...blank(rows[i].category), item: cols[0] ?? "", qty: cols[1] || "1", price: cols[2] ?? "" };
    });
    setRows((r) => [...r.slice(0, i), ...pasted, ...r.slice(i + (r[i].item ? 0 : 1))]);
  };

  const filled = rows.filter((r) => r.item.trim());
  const total = filled.reduce((s, r) => s + (num(r.price) ?? 0) * (num(r.qty) ?? 1), 0);
  const unpriced = filled.filter((r) => num(r.price) === null).length;
  const fmt = (n: number) => `${currency} ${Math.round(n).toLocaleString("en-UG")}`;
  const cell = "input min-h-[40px] w-full min-w-0 px-2.5 text-sm";

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="lines" value={JSON.stringify(filled)} />
      <datalist id="budget-categories">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-bold">Start-up budget</span>
        <span className="text-xs text-ink-muted">Tip: copy the rows of a filled-in template from Excel or Word (Item, Qty, Price) and paste them into an Item box.</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-page text-xs uppercase tracking-wider text-ink-muted">
            <tr>
              <th className="w-10 px-2 py-2.5 font-semibold">Sn</th>
              <th className="px-2 py-2.5 font-semibold">Item</th>
              <th className="w-40 px-2 py-2.5 font-semibold">Category</th>
              <th className="w-20 px-2 py-2.5 font-semibold">Qty</th>
              <th className="w-24 px-2 py-2.5 font-semibold">Unit</th>
              <th className="w-32 px-2 py-2.5 font-semibold">Price ({currency})</th>
              <th className="w-40 px-2 py-2.5 text-right font-semibold">Amount</th>
              <th className="w-20 px-2 py-2.5 text-center font-semibold">Optional</th>
              <th className="w-10 px-2 py-2.5"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => {
              const price = num(r.price);
              const amount = price === null ? null : price * (num(r.qty) ?? 1);
              return (
                <tr key={i} className="align-top">
                  <td className="px-2 py-2 pt-4 text-ink-muted">{i + 1}</td>
                  <td className="px-2 py-2">
                    <input value={r.item} onChange={(e) => set(i, { item: e.target.value })} onPaste={(e) => paste(i, e)} placeholder="e.g. Shelves" aria-label={`Item ${i + 1}`} className={cell} />
                    <input value={r.details} onChange={(e) => set(i, { details: e.target.value })} placeholder="What it is and why it's needed (optional)" aria-label={`Item ${i + 1} description`} className={`${cell} mt-1.5 text-xs`} />
                  </td>
                  <td className="px-2 py-2"><input value={r.category} onChange={(e) => set(i, { category: e.target.value })} list="budget-categories" placeholder="e.g. Equipment" aria-label={`Item ${i + 1} category`} className={cell} /></td>
                  <td className="px-2 py-2"><input value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} inputMode="decimal" aria-label={`Item ${i + 1} quantity`} className={`${cell} text-right`} /></td>
                  <td className="px-2 py-2"><input value={r.unit} onChange={(e) => set(i, { unit: e.target.value })} placeholder="pcs" aria-label={`Item ${i + 1} unit`} className={cell} /></td>
                  <td className="px-2 py-2"><input value={r.price} onChange={(e) => set(i, { price: e.target.value })} inputMode="decimal" placeholder="Not priced" aria-label={`Item ${i + 1} price`} className={`${cell} text-right`} /></td>
                  <td className="px-2 py-2 text-right">
                    {amount !== null ? <span className="block pt-2.5 font-semibold">{fmt(amount)}</span>
                      : r.item ? <input value={r.reason} onChange={(e) => set(i, { reason: e.target.value })} placeholder="Why no price?" aria-label={`Item ${i + 1} reason for no price`} className={`${cell} text-xs`} />
                        : <span className="block pt-2.5 text-ink-muted">—</span>}
                  </td>
                  <td className="px-2 py-2 pt-3.5 text-center"><input type="checkbox" checked={r.optional} onChange={(e) => set(i, { optional: e.target.checked })} aria-label={`Item ${i + 1} is optional`} className="h-4 w-4" /></td>
                  <td className="px-2 py-2 pt-3"><button type="button" onClick={() => remove(i)} aria-label={`Remove item ${i + 1}`} className="text-ink-muted hover:text-bad-fg"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-heading">
              <td colSpan={6} className="px-2 py-3">
                <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand"><Plus className="h-4 w-4" />Add a row</button>
              </td>
              <td className="px-2 py-3 text-right">
                <span className="block font-bold">{fmt(total)}</span>
                {unpriced ? <span className="block text-xs text-ink-muted">+ {unpriced} not priced</span> : null}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <span className="text-xs text-ink-muted">{filled.length} {filled.length === 1 ? "item" : "items"}. Empty rows are ignored. Leave the price empty if it isn&apos;t sourced yet; the site shows &ldquo;To be confirmed&rdquo; and leaves out the total.</span>
    </div>
  );
}

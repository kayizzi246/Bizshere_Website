"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, FileSpreadsheet, ImagePlus, Loader2, Package, Plus, Search, Trash2, Undo2, X } from "lucide-react";
import { uploadFile } from "@/components/UploadButton";
import { emptyProduct, parseCsv, productsFromRows, PRODUCT_STATUSES, STATUS_LABEL, TEMPLATE_CSV, type ProductDraft } from "@/lib/product-import";
import { saveSupplierProducts } from "./products-actions";

const TONE: Record<string, string> = { PUBLISHED: "badge-ok", DRAFT: "badge-muted", IN_REVIEW: "badge-info", ARCHIVED: "badge-bad" };

/**
 * A supplier's products on its admin page: a card with the count and a Manage products button, which
 * opens a window with every product in one table. Add, edit and remove them there, change photos, or
 * bring in many at once from an Excel (.xlsx) or CSV file. Nothing is saved until Save, which saves it
 * all and closes the window; Close leaves without saving (asking first if anything changed). A click
 * outside the window does nothing.
 */
export function ProductsManager({ contentItemId, supplierName, initial }: { contentItemId: string; supplierName: string; initial: ProductDraft[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial); // what the database holds
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ProductDraft[]>(initial);
  const [removed, setRemoved] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoFor = useRef<string | null>(null);
  const firstBox = useRef<HTMLInputElement>(null);

  const dirty = removed.length > 0 || JSON.stringify(rows) !== JSON.stringify(saved);
  const live = saved.filter((r) => r.status === "PUBLISHED").length;

  const start = () => { setRows(saved); setRemoved([]); setErrors({}); setMessage(null); setExpanded(null); setQ(""); setOpen(true); };
  const close = () => {
    if (busy) return;
    if (dirty && !window.confirm("Close without saving? Your changes to the products will be lost.")) return;
    setOpen(false);
  };

  // While open: the page behind doesn't scroll, and Escape works like Close
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); };
  });

  const set = (key: string, patch: Partial<ProductDraft>) => {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };
  const add = () => {
    const p = emptyProduct();
    setRows((all) => [p, ...all]);
    setQ("");
    requestAnimationFrame(() => firstBox.current?.focus());
  };
  const remove = (r: ProductDraft) => {
    if (r.id) setRemoved((ids) => [...ids, r.id!]);
    else setRows((all) => all.filter((x) => x.key !== r.key));
  };
  const undo = (id: string) => setRemoved((ids) => ids.filter((x) => x !== id));

  // A spreadsheet: .xlsx read in the browser, or CSV; its products are added to the table to check, then Save
  const importFile = async (file: File) => {
    setNotice(""); setMessage(null);
    try {
      const name = file.name.toLowerCase();
      let table: unknown[][];
      if (name.endsWith(".csv") || file.type === "text/csv") table = parseCsv(await file.text());
      else if (name.endsWith(".xlsx")) {
        const { readSheet } = await import("read-excel-file/browser");
        table = (await readSheet(file)) as unknown[][];
      } else if (name.endsWith(".xls")) throw new Error("This is an old Excel file (.xls). In Excel, choose File → Save As → Excel Workbook (.xlsx), or CSV, then import that.");
      else throw new Error("Choose an Excel file (.xlsx) or a CSV file.");
      const { products, skipped, error } = productsFromRows(table);
      if (error) throw new Error(error);
      setRows((all) => [...products, ...all]);
      setQ("");
      setNotice(`${products.length} product${products.length === 1 ? "" : "s"} added from ${file.name}${skipped ? ` (${skipped} row${skipped === 1 ? "" : "s"} without a name left out)` : ""}. Check them, then press Save.`);
    } catch (e) {
      setMessage({ tone: "bad", text: e instanceof Error ? e.message : "That file could not be read." });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const template = () => {
    const url = URL.createObjectURL(new Blob(["﻿" + TEMPLATE_CSV], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "products-template.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const pickPhoto = (key: string) => { photoFor.current = key; photoInput.current?.click(); };
  const uploadPhoto = async (file: File) => {
    const key = photoFor.current;
    if (!key) return;
    setUploading(key);
    try { set(key, { imageUrl: await uploadFile(file, "image") }); }
    catch (e) { setErrors((all) => ({ ...all, [key]: e instanceof Error ? e.message : "Upload failed" })); }
    finally { setUploading(null); if (photoInput.current) photoInput.current.value = ""; }
  };

  const save = async () => {
    setBusy(true); setMessage(null);
    const kept = rows.filter((r) => !(r.id && removed.includes(r.id)));
    const res = await saveSupplierProducts({ contentItemId, products: kept, removed }).catch(() => ({ ok: false as const, message: "Not saved. Check your connection and try again.", errors: {} as Record<string, string> }));
    setBusy(false);
    if (!res.ok) {
      setErrors(res.errors);
      setMessage({ tone: "bad", text: res.message });
      const first = kept.find((r) => res.errors[r.key]);
      if (first) { setQ(""); setExpanded(first.key); }
      return;
    }
    setSaved(res.products); setRows(res.products); setRemoved([]); setErrors({}); setNotice("");
    setOpen(false);
    setMessage({ tone: "ok", text: res.summary });
    router.refresh();
  };

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? rows.filter((r) => r.productName.toLowerCase().includes(term)) : rows;
  }, [rows, q]);

  const box = "input min-h-[40px] w-full min-w-0 px-2.5 text-[13px]";

  return (
    <section id="products" className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-extrabold text-heading">Products</h2>
          <p className="text-[13px] text-ink-muted">{saved.length ? `${saved.length} product${saved.length === 1 ? "" : "s"}, ${live} live on the website.` : "No products yet."} Add, edit or import them in one window.</p>
        </div>
        <button type="button" onClick={start} className="btn-primary min-h-[46px] px-5"><Package aria-hidden className="h-4 w-4" />Manage products</button>
      </div>
      {message && !open ? <p role={message.tone === "ok" ? "status" : "alert"} className={`rounded-xl p-3 text-sm font-semibold ${message.tone === "ok" ? "bg-brand-tint text-brand-dark" : "bg-bad-bg text-bad-fg"}`}>{message.text}</p> : null}
      {saved.length ? (
        <ul className="flex flex-wrap gap-2">
          {saved.slice(0, 8).map((r) => <li key={r.key} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-page px-3 py-1 text-[13px] text-ink-soft">{r.productName}<span className={`${TONE[r.status]} !px-1.5 !py-0 text-[10px]`}>{STATUS_LABEL[r.status]}</span></li>)}
          {saved.length > 8 ? <li className="self-center text-[13px] text-ink-muted">and {saved.length - 8} more</li> : null}
        </ul>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-stretch justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="products-title" className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-surface shadow-2xl sm:h-[90vh] sm:rounded-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex min-w-0 flex-col">
                <h2 id="products-title" className="truncate font-display text-[18px] font-extrabold text-heading">Products: {supplierName}</h2>
                <p className="text-[13px] text-ink-muted">{rows.length - removed.length} product{rows.length - removed.length === 1 ? "" : "s"}. Changes are saved when you press Save.</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-heading hover:bg-page"><X className="h-5 w-5" /></button>
            </div>

            {/* Tools */}
            <div className="flex flex-wrap items-center gap-2 border-b border-line bg-page/60 px-4 py-3 sm:px-6">
              <button type="button" onClick={add} className="btn-primary min-h-[42px] px-4 text-[14px]"><Plus aria-hidden className="h-4 w-4" />Add product</button>
              <button type="button" onClick={() => fileInput.current?.click()} className="btn-outline min-h-[42px] px-4 text-[14px]"><FileSpreadsheet aria-hidden className="h-4 w-4" />Import Excel or CSV</button>
              <button type="button" onClick={template} className="min-h-[42px] px-2 text-[13px] font-semibold text-brand hover:text-brand-dark"><Download aria-hidden className="mr-1 inline h-4 w-4" />Download template</button>
              <input ref={fileInput} type="file" accept=".xlsx,.csv,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
              <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
              <label className="ml-auto flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 sm:max-w-[260px] sm:flex-none">
                <Search aria-hidden className="h-4 w-4 shrink-0 text-ink-muted" />
                <span className="sr-only">Find a product</span>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a product" className="min-h-[40px] w-full bg-transparent text-[14px] outline-none" />
              </label>
            </div>
            {notice ? <p role="status" className="border-b border-line bg-brand-tint px-4 py-2.5 text-[13px] font-semibold text-brand-dark sm:px-6">{notice}</p> : null}
            {message ? <p role="alert" className={`border-b border-line px-4 py-2.5 text-[13px] font-semibold sm:px-6 ${message.tone === "ok" ? "bg-brand-tint text-brand-dark" : "bg-bad-bg text-bad-fg"}`}>{message.text}</p> : null}

            {/* The products */}
            <div className="flex-1 overflow-auto">
              {shown.length ? (
                <table className="w-full min-w-[920px] border-collapse text-left text-[13px]">
                  <thead className="sticky top-0 z-10 bg-surface text-[11px] font-semibold uppercase tracking-wider text-ink-muted shadow-[0_1px_0_rgb(0_0_0/0.08)]">
                    <tr><th className="w-[88px] px-3 py-2.5">Photo</th><th className="px-2 py-2.5">Product name *</th><th className="w-[120px] px-2 py-2.5">Price from</th><th className="w-[120px] px-2 py-2.5">Price to</th><th className="w-[130px] px-2 py-2.5">Package unit</th><th className="w-[130px] px-2 py-2.5">Availability</th><th className="w-[120px] px-2 py-2.5">Show</th><th className="w-[96px] px-3 py-2.5"><span className="sr-only">Actions</span></th></tr>
                  </thead>
                  <tbody>
                    {shown.map((r, n) => {
                      const gone = Boolean(r.id && removed.includes(r.id));
                      const err = errors[r.key];
                      const more = expanded === r.key;
                      return [
                        <tr key={r.key} className={`border-t border-line align-middle ${gone ? "bg-page opacity-60" : err ? "bg-bad-bg/40" : !r.id ? "bg-brand-tint/40" : ""}`}>
                          <td className="px-3 py-2">
                            <button type="button" disabled={gone} onClick={() => pickPhoto(r.key)} aria-label={r.imageUrl ? `Change the photo of ${r.productName || "this product"}` : `Add a photo to ${r.productName || "this product"}`}
                              className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-page text-ink-muted hover:border-brand hover:text-brand">
                              {uploading === r.key ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : r.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element -- uploaded or pasted address
                                <img src={r.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                              ) : <ImagePlus aria-hidden className="h-5 w-5" />}
                            </button>
                          </td>
                          <td className="px-2 py-2"><input ref={n === 0 && !r.id ? firstBox : undefined} disabled={gone} value={r.productName} onChange={(e) => set(r.key, { productName: e.target.value })} aria-label="Product name" placeholder="e.g. Maize flour" className={`${box} font-semibold ${err?.includes("name") ? "border-bad-fg" : ""}`} /></td>
                          <td className="px-2 py-2"><input disabled={gone} value={r.priceMin} onChange={(e) => set(r.key, { priceMin: e.target.value })} aria-label="Price from" inputMode="decimal" placeholder={r.currency || "UGX"} className={box} /></td>
                          <td className="px-2 py-2"><input disabled={gone} value={r.priceMax} onChange={(e) => set(r.key, { priceMax: e.target.value })} aria-label="Price to" inputMode="decimal" placeholder="optional" className={box} /></td>
                          <td className="px-2 py-2"><input disabled={gone} value={r.unit} onChange={(e) => set(r.key, { unit: e.target.value })} aria-label="Package unit" placeholder="e.g. 50 kg bag" className={box} /></td>
                          <td className="px-2 py-2"><input disabled={gone} value={r.availability} onChange={(e) => set(r.key, { availability: e.target.value })} aria-label="Availability" placeholder="e.g. In stock" className={box} /></td>
                          <td className="px-2 py-2">
                            <select disabled={gone} value={r.status} onChange={(e) => set(r.key, { status: e.target.value as ProductDraft["status"] })} aria-label="Show on the website" className={`${box} font-semibold`}>
                              {PRODUCT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <span className="flex items-center justify-end gap-1">
                              {gone ? (
                                <button type="button" onClick={() => undo(r.id!)} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-brand hover:bg-brand-tint"><Undo2 aria-hidden className="h-4 w-4" />Undo</button>
                              ) : (
                                <>
                                  <button type="button" onClick={() => setExpanded(more ? null : r.key)} aria-expanded={more} aria-label={`More details for ${r.productName || "this product"}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-page"><ChevronDown aria-hidden className={`h-4 w-4 transition-transform ${more ? "rotate-180" : ""}`} /></button>
                                  <button type="button" onClick={() => remove(r)} aria-label={`Remove ${r.productName || "this product"}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-bad-fg hover:bg-bad-bg"><Trash2 aria-hidden className="h-4 w-4" /></button>
                                </>
                              )}
                            </span>
                          </td>
                        </tr>,
                        err && !gone ? <tr key={r.key + "-err"} className="bg-bad-bg/40"><td /><td colSpan={7} className="px-2 pb-2 text-[12px] font-semibold text-bad-fg">{err}</td></tr> : null,
                        more && !gone ? (
                          <tr key={r.key + "-more"} className="bg-page/70">
                            <td />
                            <td colSpan={7} className="px-2 pb-3 pt-1">
                              <div className="grid gap-2 sm:grid-cols-[110px_140px_minmax(0,1fr)]">
                                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">Currency<input value={r.currency} maxLength={3} onChange={(e) => set(r.key, { currency: e.target.value.toUpperCase() })} className={box} /></label>
                                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">Minimum order<input value={r.minimumOrderQuantity} inputMode="decimal" onChange={(e) => set(r.key, { minimumOrderQuantity: e.target.value })} placeholder="e.g. 10" className={box} /></label>
                                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">Photo link<input value={r.imageUrl} onChange={(e) => set(r.key, { imageUrl: e.target.value })} placeholder="Use the photo box, or paste a link" className={box} /></label>
                                <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft sm:col-span-3">Description<textarea value={r.specifications} rows={2} onChange={(e) => set(r.key, { specifications: e.target.value })} className={`${box} py-2`} /></label>
                              </div>
                            </td>
                          </tr>
                        ) : null,
                      ];
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
                  <Package aria-hidden className="h-10 w-10 text-ink-muted" />
                  <p className="font-semibold text-heading">{q ? "No product matches." : "No products yet."}</p>
                  {!q ? <p className="max-w-sm text-[13px] text-ink-muted">Press Add product, or import a whole list from Excel or CSV. Download the template to see the columns.</p> : null}
                </div>
              )}
            </div>

            {/* Footer: the only way out besides Close */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6">
              <span className="text-[13px] text-ink-muted">{dirty ? "You have changes that are not saved yet." : "No changes yet."}</span>
              <span className="flex gap-2">
                <button type="button" onClick={close} disabled={busy} className="btn-outline min-h-[46px] px-5">Close</button>
                <button type="button" onClick={save} disabled={busy} className="btn-primary min-h-[46px] px-8 disabled:opacity-60">{busy ? <><Loader2 aria-hidden className="h-4 w-4 animate-spin" />Saving…</> : "Save"}</button>
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

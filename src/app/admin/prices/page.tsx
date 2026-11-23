import Link from "next/link";
import type { PriceObservation } from "@prisma/client";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { date, isOlderThan, moneyRange } from "@/lib/format";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  addMarket, addObservation, addProduct, deleteMarket, deleteObservation, deleteProduct,
  setProductSupplier, updateMarket, updateObservation, updateProduct,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Market prices" };

type Search = { error?: string; added?: string; mapped?: string; saved?: string; deleted?: string; edit?: string; editMarket?: string; editProduct?: string };

const SAVED: Record<string, string> = { price: "Price saved.", market: "Market saved.", product: "Product saved." };
const DELETED: Record<string, string> = { price: "Price deleted.", market: "Market deleted.", product: "Product deleted." };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const triValue = (v: boolean | null) => (v === null ? "" : String(v));

export default async function AdminPricesPage({ searchParams }: { searchParams: Search }) {
  await requireArea("prices");
  const [markets, products, suppliers, districts, recent, editing] = await Promise.all([
    prisma.market.findMany({ include: { location: true, _count: { select: { observations: true } } }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ include: { _count: { select: { observations: true, watches: true } } }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ select: { id: true, contentItem: { select: { title: true } } }, orderBy: { contentItem: { title: "asc" } } }),
    prisma.location.findMany({ where: { type: "DISTRICT" }, orderBy: { name: "asc" } }),
    prisma.priceObservation.findMany({ include: { market: true, product: true, collector: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    searchParams.edit ? prisma.priceObservation.findUnique({ where: { id: searchParams.edit } }) : null,
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const notice = searchParams.added ? "Price added." : SAVED[searchParams.saved ?? ""] ?? DELETED[searchParams.deleted ?? ""] ?? null;

  return (
    <>
      <div><h1 className="font-display text-[22px] font-extrabold tracking-tight text-heading">Market prices</h1><p className="text-sm text-ink-muted">Record what a product cost at a market on a given day. Each day is a new price, so the history stays; use Edit only to correct a mistake. This is separate from what suppliers and experts pay: that is under Subscription prices.</p></div>
      {searchParams.error ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}
      {notice ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-bold text-brand-dark">{notice}</p> : null}

      <PriceForm o={editing} markets={markets} products={products} today={today} />

      <div className="flex flex-wrap gap-5">
        <form action={addMarket} className="card flex flex-[1_1_380px] flex-col gap-3 p-6">
          <h2 className="text-lg font-extrabold">Add a market</h2>
          <input name="name" required placeholder="Market name" aria-label="Market name" className="input" />
          <input name="marketType" placeholder="Type (wholesale, retail, livestock…)" aria-label="Market type" className="input" />
          <select name="locationId" aria-label="District" className="input"><option value="">District…</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <input name="town" placeholder="Town" aria-label="Town" className="input" />
          <button className="btn-outline self-end">Add market</button>
        </form>
        <form action={addProduct} className="card flex flex-[1_1_380px] flex-col gap-3 p-6">
          <h2 className="text-lg font-extrabold">Add a product</h2>
          <input name="name" required placeholder="Product name" aria-label="Product name" className="input" />
          <input name="variety" placeholder="Variety" aria-label="Variety" className="input" />
          <input name="grade" placeholder="Grade" aria-label="Grade" className="input" />
          <input name="standardUnit" placeholder="Standard unit, e.g. 50 kg bag" aria-label="Standard unit" className="input" />
          <input name="localNames" placeholder="Local names, comma-separated" aria-label="Local names" className="input" />
          <button className="btn-outline self-end">Add product</button>
        </form>
      </div>

      {/* Markets: edit or delete */}
      <section id="markets" className="card flex scroll-mt-20 flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-extrabold">Markets</h2>
          <p className="text-sm text-ink-muted">Deleting a market also deletes every price recorded at it.</p>
        </div>
        <ul className="flex flex-col gap-2">
          {markets.map((m) => (
            <li key={m.id} className="rounded-xl border border-line p-3">
              {searchParams.editMarket === m.id ? (
                <form action={updateMarket} className="flex flex-col gap-3">
                  <input type="hidden" name="id" value={m.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="label min-w-0">Market name<input name="name" required defaultValue={m.name} className="input" /></label>
                    <label className="label min-w-0">Type<input name="marketType" defaultValue={m.marketType ?? ""} placeholder="wholesale, retail, livestock…" className="input" /></label>
                    <label className="label min-w-0">District<select name="locationId" defaultValue={m.locationId ?? ""} className="input"><option value="">None</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
                    <label className="label min-w-0">Town<input name="town" defaultValue={m.town ?? ""} className="input" /></label>
                    <label className="label min-w-0">Address<input name="address" defaultValue={m.address ?? ""} className="input" /></label>
                    <label className="label min-w-0">Market days<input name="operatingDays" defaultValue={m.operatingDays ?? ""} placeholder="Mon–Sat" className="input" /></label>
                    <label className="label min-w-0 sm:col-span-2">Contact<input name="contact" defaultValue={m.contact ?? ""} className="input" /></label>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href="/admin/prices#markets" className="btn-outline min-h-[40px] px-4 text-sm">Cancel</Link>
                    <button className="btn-primary min-h-[40px] px-4 text-sm">Save market</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex min-w-[12rem] flex-1 flex-col">
                    <span className="text-sm font-semibold text-heading">{m.name}</span>
                    <span className="text-xs text-ink-muted">{[m.marketType, m.town, m.location?.name].filter(Boolean).join(" · ") || "No details yet"} · {plural(m._count.observations, "price", "prices")}</span>
                  </span>
                  <Link href={`/admin/prices?editMarket=${m.id}#markets`} className="btn-outline min-h-[36px] px-4 text-[13px]">Edit</Link>
                  <form>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmButton action={deleteMarket} plain className="h-9" title={`Delete "${m.name}"?`}
                      message={m._count.observations ? `This also deletes the ${plural(m._count.observations, "price", "prices")} recorded at this market. This cannot be undone.` : "No prices use this market. This cannot be undone."}>Delete</ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
          {markets.length === 0 ? <li className="text-sm text-ink-muted">No markets yet.</li> : null}
        </ul>
      </section>

      {/* Products: edit or delete */}
      <section id="products" className="card flex scroll-mt-20 flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-extrabold">Products</h2>
          <p className="text-sm text-ink-muted">Deleting a product also deletes its prices and the price alerts members set on it. Supplier listings and recipes that used it stay, without the link.</p>
        </div>
        <ul className="flex flex-col gap-2">
          {products.map((p) => (
            <li key={p.id} className="rounded-xl border border-line p-3">
              {searchParams.editProduct === p.id ? (
                <form action={updateProduct} className="flex flex-col gap-3">
                  <input type="hidden" name="id" value={p.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="label min-w-0">Product name<input name="name" required defaultValue={p.name} className="input" /></label>
                    <label className="label min-w-0">Variety<input name="variety" defaultValue={p.variety ?? ""} className="input" /></label>
                    <label className="label min-w-0">Grade<input name="grade" defaultValue={p.grade ?? ""} className="input" /></label>
                    <label className="label min-w-0">Standard unit<input name="standardUnit" defaultValue={p.standardUnit ?? ""} placeholder="50 kg bag" className="input" /></label>
                    <label className="label min-w-0 sm:col-span-2">Local names, comma-separated<input name="localNames" defaultValue={p.localNames.join(", ")} className="input" /></label>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Link href="/admin/prices#products" className="btn-outline min-h-[40px] px-4 text-sm">Cancel</Link>
                    <button className="btn-primary min-h-[40px] px-4 text-sm">Save product</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex min-w-[12rem] flex-1 flex-col">
                    <span className="text-sm font-semibold text-heading">{p.name}{p.variety ? ` (${p.variety})` : ""}{p.grade ? `, ${p.grade}` : ""}</span>
                    <span className="text-xs text-ink-muted">{p.standardUnit ?? "No unit set"} · {plural(p._count.observations, "price", "prices")}</span>
                  </span>
                  <Link href={`/admin/prices?editProduct=${p.id}#products`} className="btn-outline min-h-[36px] px-4 text-[13px]">Edit</Link>
                  <form>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmButton action={deleteProduct} plain className="h-9" title={`Delete "${p.name}"?`}
                      message={[
                        p._count.observations ? `This also deletes its ${plural(p._count.observations, "price", "prices")}` : "No prices use this product",
                        p._count.watches ? ` and ${plural(p._count.watches, "member's price alert", "members' price alerts")}` : "",
                        ". This cannot be undone.",
                      ].join("")}>Delete</ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
          {products.length === 0 ? <li className="text-sm text-ink-muted">No products yet.</li> : null}
        </ul>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-extrabold">Suppliers on the prices page</h2>
          <p className="text-sm text-ink-muted">Every product has a Supplier link, for members only. Choose a supplier and it opens that supplier; with none chosen it searches the suppliers for the product.</p>
        </div>
        {searchParams.mapped ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Supplier saved.</p> : null}
        <ul className="flex flex-col gap-2">
          {products.map((p) => (
            <li key={p.id}>
              <form action={setProductSupplier} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
                <input type="hidden" name="productId" value={p.id} />
                <span className="min-w-[10rem] flex-1 text-sm font-semibold text-heading">{p.name}{p.grade ? `, ${p.grade}` : ""}</span>
                <select name="supplierId" defaultValue={p.supplierId ?? ""} aria-label={`Supplier for ${p.name}`} className="input min-h-[40px] w-full max-w-xs">
                  <option value="">No supplier</option>
                  {suppliers.map((x) => <option key={x.id} value={x.id}>{x.contentItem.title.replace(/^Sample:\s*/i, "")}</option>)}
                </select>
                <button className="btn-outline min-h-[40px] px-4 text-sm">Save</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="card overflow-hidden">
        <h2 className="p-5 text-lg font-extrabold">Recent prices</h2>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[1000px]">
            <thead><tr><th>Product</th><th>Market</th><th>Min – max price</th><th>Unit</th><th>Observed</th><th>Status</th><th>By</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className="font-bold">{o.product.name}{o.grade ? `, ${o.grade}` : ""}</td>
                  <td>{o.market.name}</td>
                  <td>{moneyRange(o.priceMin, o.priceMax, o.currency, "—")}</td>
                  <td>{o.quotedUnit}{o.product.standardUnit && o.product.standardUnit !== o.quotedUnit ? <span className="badge-warn ml-1">not comparable</span> : null}</td>
                  <td>{date(o.observedAt)}{isOlderThan(o.observedAt, 30) ? <span className="badge-warn ml-1">stale</span> : null}</td>
                  <td>{o.status.replace("_", " ").toLowerCase()}</td>
                  <td className="text-ink-muted">{o.collector?.name ?? "—"}</td>
                  <td>
                    <span className="flex justify-end gap-2">
                      <Link href={`/admin/prices?edit=${o.id}`} className="btn-outline min-h-[36px] px-4 text-[13px]">Edit</Link>
                      <form>
                        <input type="hidden" name="id" value={o.id} />
                        <ConfirmButton action={deleteObservation} plain className="h-9" title="Delete this price?"
                          message={`${o.product.name} at ${o.market.name} on ${date(o.observedAt)} will be removed from the site and its history. This cannot be undone.`}>Delete</ConfirmButton>
                      </form>
                    </span>
                  </td>
                </tr>
              ))}
              {recent.length === 0 ? <tr><td colSpan={8} className="text-ink-muted">No prices yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/** The add-a-price form; with `o` it edits that price instead. */
function PriceForm({ o, markets, products, today }: {
  o: PriceObservation | null;
  markets: { id: string; name: string; location: { name: string } | null }[];
  products: { id: string; name: string; grade: string | null; standardUnit: string | null }[];
  today: string;
}) {
  const v = (x: unknown) => (x === null || x === undefined ? "" : String(x));
  return (
    <form key={o?.id ?? "new"} action={o ? updateObservation : addObservation} className={`card flex flex-col gap-4 p-6 ${o ? "ring-2 ring-brand" : ""}`}>
      {o ? <input type="hidden" name="id" value={o.id} /> : null}
      <h2 className="text-lg font-extrabold">{o ? "Edit price" : "Add a market price"}</h2>
      <div className="flex flex-wrap gap-3.5">
        <label className="label flex-[1_1_220px]">Market<select name="marketId" required defaultValue={o?.marketId} className="input">{markets.map((m) => <option key={m.id} value={m.id}>{m.name}{m.location ? `, ${m.location.name}` : ""}</option>)}</select></label>
        <label className="label flex-[1_1_220px]">Product<select name="productId" required defaultValue={o?.productId} className="input">{products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.grade ? `, ${p.grade}` : ""}{p.standardUnit ? ` (${p.standardUnit})` : ""}</option>)}</select></label>
        <label className="label flex-[1_1_160px]">Observed on<input name="observedAt" type="date" required defaultValue={o ? o.observedAt.toISOString().slice(0, 10) : today} max={today} className="input" /></label>
        <label className="label flex-[1_1_160px]">Price type<select name="priceType" defaultValue={o?.priceType ?? "WHOLESALE"} className="input"><option value="WHOLESALE">Wholesale</option><option value="RETAIL">Retail</option><option value="FARM_GATE">Farm-gate</option></select></label>
      </div>
      <div className="flex flex-wrap gap-3.5">
        <label className="label flex-[1_1_160px]">Min price<input name="priceMin" inputMode="numeric" defaultValue={v(o?.priceMin)} className="input" /></label>
        <label className="label flex-[1_1_160px]">Max price<input name="priceMax" inputMode="numeric" defaultValue={v(o?.priceMax)} className="input" /></label>
        <label className="label flex-[0_1_100px]">Currency<input name="currency" defaultValue={o?.currency ?? "UGX"} className="input" /></label>
        <label className="label flex-[1_1_180px]">Quoted unit<input name="quotedUnit" required defaultValue={v(o?.quotedUnit)} placeholder="Must match the product's unit to compare" className="input" /></label>
        <label className="label flex-[1_1_140px]">Grade<input name="grade" defaultValue={v(o?.grade)} className="input" /></label>
        <label className="label flex-[1_1_140px]">Package size<input name="packageSize" defaultValue={v(o?.packageSize)} className="input" /></label>
      </div>
      <div className="flex flex-wrap gap-3.5">
        <label className="label flex-[1_1_140px]">Number of quotes<input name="quoteCount" inputMode="numeric" defaultValue={v(o?.quoteCount)} className="input" /></label>
        <label className="label flex-[1_1_200px]">Collection method<input name="collectionMethod" defaultValue={v(o?.collectionMethod)} placeholder="market visit, phone survey…" className="input" /></label>
        <label className="label flex-[1_1_140px]">Includes tax<select name="includesTax" defaultValue={o ? triValue(o.includesTax) : ""} className="input"><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></label>
        <label className="label flex-[1_1_140px]">Includes transport<select name="includesTransport" defaultValue={o ? triValue(o.includesTransport) : ""} className="input"><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></label>
      </div>
      <label className="label">Remark<input name="notes" defaultValue={v(o?.notes)} className="input" /></label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {o?.status === "PUBLISHED" ? (
          <><input type="hidden" name="publish" value="on" /><span className="text-sm text-ink-muted">This price is live; saving updates it on the site straight away.</span></>
        ) : (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" className="h-4 w-4 accent-brand" />Publish now (I checked the evidence). Otherwise it {o ? "stays in" : "goes to"} the review queue.</label>
        )}
        <span className="flex gap-2">
          {o ? <Link href="/admin/prices" className="btn-outline">Cancel</Link> : null}
          <button className="btn-primary">{o ? "Save price" : "Add price"}</button>
        </span>
      </div>
    </form>
  );
}

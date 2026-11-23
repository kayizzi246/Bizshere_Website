import Link from "next/link";
import type { PriceObservation } from "@prisma/client";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { date, isOlderThan, moneyRange } from "@/lib/format";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SearchSelect, type SearchOption } from "@/components/SearchSelect";
import {
  addMarket, addObservation, addProduct, addProductCategory, deleteMarket, deleteObservation, deleteProduct,
  deleteProductCategory, setProductSupplier, updateMarket, updateObservation, updateProduct,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Market prices" };

type Search = { error?: string; added?: string; mapped?: string; saved?: string; deleted?: string; edit?: string; editMarket?: string; editProduct?: string };

const SAVED: Record<string, string> = { price: "Price saved.", market: "Market saved.", product: "Product saved.", category: "Category added." };
const DELETED: Record<string, string> = { price: "Price deleted.", market: "Market deleted.", product: "Product deleted.", category: "Category deleted." };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
type Options = Record<"markets" | "products" | "suppliers" | "categories" | "districts", SearchOption[]>;
const PRICE_TYPES: SearchOption[] = [
  { value: "WHOLESALE", label: "Wholesale", hint: "Bulk, trader to trader" },
  { value: "RETAIL", label: "Retail", hint: "Shop or stall, to the buyer" },
  { value: "FARM_GATE", label: "Farm-gate", hint: "Paid to the farmer at the farm" },
];

export default async function AdminPricesPage({ searchParams }: { searchParams: Search }) {
  await requireArea("prices");
  const [markets, products, suppliers, districts, recent, editing, categories] = await Promise.all([
    prisma.market.findMany({ include: { location: true, _count: { select: { observations: true } } }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ include: { category: { select: { name: true } }, _count: { select: { observations: true, watches: true } } }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ select: { id: true, contentItem: { select: { title: true } } }, orderBy: { contentItem: { title: "asc" } } }),
    prisma.location.findMany({ where: { type: "DISTRICT" }, orderBy: { name: "asc" } }),
    prisma.priceObservation.findMany({ include: { market: true, product: true, collector: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
    searchParams.edit ? prisma.priceObservation.findUnique({ where: { id: searchParams.edit } }) : null,
    prisma.category.findMany({
      where: { kind: "PRODUCT_CATEGORY" },
      include: { _count: { select: { products: true, primaryFor: true, contentLinks: true, orgLinks: true, children: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const supplierName = new Map(suppliers.map((x) => [x.id, x.contentItem.title.replace(/^Sample:\s*/i, "")]));
  // The options for the searchable dropdowns (src/components/SearchSelect.tsx)
  const opts: Options = {
    markets: markets.map((m) => ({ value: m.id, label: m.name, hint: [m.town, m.location?.name].filter(Boolean).join(", ") || undefined })),
    products: products.map((p) => ({ value: p.id, label: `${p.name}${p.grade ? `, ${p.grade}` : ""}`, hint: [p.category?.name, p.standardUnit].filter(Boolean).join(" · ") || undefined })),
    suppliers: suppliers.map((x) => ({ value: x.id, label: supplierName.get(x.id)! })),
    categories: categories.map((c) => ({ value: c.id, label: c.name, hint: plural(c._count.products, "product", "products") })),
    districts: districts.map((d) => ({ value: d.id, label: d.name })),
  };
  const productSupplier = new Map(products.map((p) => [p.id, p.supplierId]));
  const notice = searchParams.added ? "Price added." : SAVED[searchParams.saved ?? ""] ?? DELETED[searchParams.deleted ?? ""] ?? null;

  return (
    <>
      <div><h1 className="font-display text-[22px] font-extrabold tracking-tight text-heading">Market prices</h1><p className="text-sm text-ink-muted">Record what a product cost at a market on a given day. Each day is a new price, so the history stays; use Edit only to correct a mistake. This is separate from what suppliers and experts pay: that is under Subscription prices.</p></div>
      {searchParams.error ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}
      {notice ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-bold text-brand-dark">{notice}</p> : null}

      <PriceForm o={editing} fresh={searchParams.added ?? ""} opts={opts} supplierOf={editing ? productSupplier.get(editing.productId) ?? "" : ""} />

      <div className="flex flex-wrap gap-5">
        <form action={addMarket} className="card flex flex-[1_1_380px] flex-col gap-3 p-6">
          <h2 className="text-lg font-extrabold">Add a market</h2>
          <input name="name" required placeholder="Market name" aria-label="Market name" className="input" />
          <input name="marketType" placeholder="Type (wholesale, retail, livestock…)" aria-label="Market type" className="input" />
          <SearchSelect name="locationId" label="District" placeholder="District…" options={opts.districts} clearable />
          <input name="town" placeholder="Town" aria-label="Town" className="input" />
          <button className="btn-outline self-end">Add market</button>
        </form>
        <form action={addProduct} className="card flex flex-[1_1_380px] flex-col gap-3 p-6">
          <h2 className="text-lg font-extrabold">Add a product</h2>
          <input name="name" required placeholder="Product name" aria-label="Product name" className="input" />
          <SearchSelect name="categoryId" label="Product category" placeholder="Product category (Grocery, Produce, Textiles…)" options={opts.categories} clearable emptyText="No such category. Add it under Product categories below." />
          <SearchSelect name="supplierId" label="Supplier" placeholder="Supplier (the Supplier link on the prices page)" options={opts.suppliers} clearable />
          <input name="grade" placeholder="Grade" aria-label="Grade" className="input" />
          <input name="standardUnit" placeholder="Standard unit, e.g. 50 kg bag" aria-label="Standard unit" className="input" />
          <input name="localNames" placeholder="Local names, comma-separated" aria-label="Local names" className="input" />
          <button className="btn-outline self-end">Add product</button>
        </form>
      </div>

      {/* Product categories: add one, or delete one nothing uses */}
      <section id="categories" className="card flex scroll-mt-20 flex-col gap-3 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-extrabold">Product categories</h2>
          <p className="text-sm text-ink-muted">Visitors can filter the prices page by these. It is the same list suppliers use, so a category added here also shows for suppliers. To rename one, use <Link href="/admin/categories?kind=PRODUCT_CATEGORY" className="font-semibold text-brand">Categories</Link>.</p>
        </div>
        <form action={addProductCategory} className="flex flex-wrap items-center gap-2">
          <input name="name" required minLength={2} maxLength={80} placeholder="New category, e.g. Textiles" aria-label="New product category" className="input min-h-[40px] min-w-0 flex-[1_1_220px]" />
          <button className="btn-outline min-h-[40px] px-4 text-sm">Add category</button>
        </form>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const uses = Object.values(c._count).reduce((n, x) => n + x, 0);
            return (
              <li key={c.id} className="flex items-center gap-2 rounded-full border border-line py-1 pl-3.5 pr-1 text-sm">
                <span className="font-semibold text-heading">{c.name}</span>
                <span className="text-xs text-ink-muted">{plural(c._count.products, "product", "products")}</span>
                {uses === 0 ? (
                  <form>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton action={deleteProductCategory} plain className="h-8 px-3" title={`Delete "${c.name}"?`} message="Nothing uses this category, so nothing on the website changes.">Delete</ConfirmButton>
                  </form>
                ) : <span className="px-2 text-xs text-ink-muted">in use</span>}
              </li>
            );
          })}
          {categories.length === 0 ? <li className="text-sm text-ink-muted">No categories yet.</li> : null}
        </ul>
      </section>

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
                    <div className="label min-w-0">District<SearchSelect name="locationId" label="District" placeholder="None" defaultValue={m.locationId ?? ""} options={opts.districts} clearable /></div>
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
                    <div className="label min-w-0">Product category<SearchSelect name="categoryId" label="Product category" placeholder="No category" defaultValue={p.categoryId ?? ""} options={opts.categories} clearable /></div>
                    <div className="label min-w-0">Supplier<SearchSelect name="supplierId" label="Supplier" placeholder="No supplier" defaultValue={p.supplierId ?? ""} options={opts.suppliers} clearable /></div>
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
                    <span className="text-xs text-ink-muted">{p.category?.name ?? "No category"} · {p.supplierId ? supplierName.get(p.supplierId) ?? "Supplier" : "No supplier"} · {p.standardUnit ?? "No unit set"} · {plural(p._count.observations, "price", "prices")}</span>
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
            <thead><tr><th>Product</th><th>Market</th><th>Price</th><th>Unit</th><th>Observed</th><th>Status</th><th>By</th><th className="text-right">Actions</th></tr></thead>
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

/**
 * The price form: market, product, supplier, price type and price. Every field starts empty, and
 * `fresh` changes after each price is added so the form is rebuilt empty for the next one. With `o`
 * it edits that price instead. The supplier is optional: picked, it becomes the product's Supplier
 * link on /prices; left empty, the product keeps the supplier it has.
 */
function PriceForm({ o, fresh, opts, supplierOf }: { o: PriceObservation | null; fresh: string; opts: Options; supplierOf: string }) {
  const amount = o ? String(o.priceMax ?? o.priceMin ?? "") : "";
  return (
    <form key={o?.id ?? `new-${fresh}`} action={o ? updateObservation : addObservation} className={`card flex flex-col gap-4 p-6 ${o ? "ring-2 ring-brand" : ""}`}>
      {o ? <input type="hidden" name="id" value={o.id} /> : null}
      <h2 className="text-lg font-extrabold">{o ? "Edit price" : "Add a market price"}</h2>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="label min-w-0">Market
          <SearchSelect name="marketId" label="Market" placeholder="Choose a market…" required defaultValue={o?.marketId ?? ""} options={opts.markets} emptyText="No market by that name. Add it under Add a market." />
        </div>
        <div className="label min-w-0">Product name
          <SearchSelect name="productId" label="Product" placeholder="Choose a product…" required defaultValue={o?.productId ?? ""} options={opts.products} emptyText="No product by that name. Add it under Add a product." />
        </div>
        <div className="label min-w-0">Supplier <span className="font-normal text-ink-muted">(optional)</span>
          <SearchSelect name="supplierId" label="Supplier" placeholder="Choose a supplier…" defaultValue={supplierOf} options={opts.suppliers} clearable />
        </div>
        <div className="label min-w-0">Price type
          <SearchSelect name="priceType" label="Price type" placeholder="Choose a price type…" required defaultValue={o?.priceType ?? ""} options={PRICE_TYPES} />
        </div>
        <label className="label min-w-0">Price (UGX)
          <input name="price" required inputMode="numeric" defaultValue={amount} placeholder="e.g. 125,000" className="input" />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-ink-muted">{o ? `Recorded on ${o.observedAt.toISOString().slice(0, 10)}. Saving updates it on the site straight away.` : "Dated today and shown on the site straight away."}</span>
        <span className="flex gap-2">
          {o ? <Link href="/admin/prices" className="btn-outline">Cancel</Link> : null}
          <button className="btn-primary">{o ? "Save price" : "Add price"}</button>
        </span>
      </div>
    </form>
  );
}

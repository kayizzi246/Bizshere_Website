import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, isOlderThan, money } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { AutoSubmit } from "@/components/AutoSubmit";import type { PriceType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Markets and prices" };

const STALE_DAYS = 30;

export default async function PricesPage({ searchParams }: { searchParams: { product?: string; type?: string } }) {
  const viewer = await getViewer();
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  const product = products.find((p) => p.id === searchParams.product) ?? products[0];
  const priceType = (["RETAIL", "WHOLESALE", "FARM_GATE"].includes(searchParams.type ?? "") ? searchParams.type : "WHOLESALE") as PriceType;

  // Latest published observation per market for the chosen product + price type.
  const observations = product
    ? await prisma.priceObservation.findMany({
        where: { productId: product.id, priceType, status: "PUBLISHED" },
        include: { market: { include: { location: { include: { parent: true } } } } },
        orderBy: { observedAt: "desc" },
      })
    : [];
  const latestByMarket = new Map<string, (typeof observations)[number]>();
  for (const o of observations) if (!latestByMarket.has(o.marketId)) latestByMarket.set(o.marketId, o);
  const rows = [...latestByMarket.values()];
  // Compare only like-for-like units (blueprint comparison rule)
  const unit = product?.standardUnit;
  const comparable = rows.filter((r) => !unit || r.quotedUnit === unit);
  const visible = viewer.isMember ? comparable : comparable.slice(0, FREE_PREVIEW.markets);
  const hidden = comparable.length - visible.length;

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container-site flex flex-col gap-4 py-8">
          <h1 className="text-2xl font-extrabold tracking-tight">Markets and prices</h1>
          <p className="text-ink-muted">Dated price observations from markets across Uganda. Every price shows when it was observed.</p>
          <form className="flex flex-wrap items-end gap-3">
            <label className="label flex-[1_1_220px]">Product
              <select name="product" defaultValue={product?.id} className="input">
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.grade ? `, ${p.grade}` : ""}{p.standardUnit ? ` (${p.standardUnit})` : ""}</option>)}
              </select>
            </label>
            <label className="label flex-[1_1_180px]">Price type
              <select name="type" defaultValue={priceType} className="input">
                <option value="WHOLESALE">Wholesale</option><option value="RETAIL">Retail</option><option value="FARM_GATE">Farm-gate</option>
              </select>
            </label>
            <AutoSubmit />
            <noscript><button className="btn-primary">Show prices</button></noscript>
          </form>
        </div>
      </section>
      <div className="container-site flex flex-col gap-4 py-7">
        <p className="text-sm text-ink-muted">Only markets with the same grade and unit{unit ? ` (${unit})` : ""} are compared.</p>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[980px] text-[15px]">
              <thead><tr><th>Market name</th><th>Country</th><th>District</th><th>Product name</th><th>Min price</th><th>Max price</th><th>Remark</th><th>Observed</th></tr></thead>
              <tbody>
                {visible.map((o) => (
                  <tr key={o.id}>
                    <td className="font-bold">{o.market.name}</td>
                    <td className="text-ink-muted">{o.market.location?.type === "DISTRICT" ? o.market.location.parent?.name ?? "—" : o.market.location?.name ?? "—"}</td>
                    <td className="text-ink-muted">{o.market.location?.type === "DISTRICT" ? o.market.location.name : "—"}</td>
                    <td>{product?.name}{product?.grade ? `, ${product.grade}` : ""} <span className="text-ink-muted">({o.quotedUnit})</span></td>
                    <td className="font-extrabold">{money(o.priceMin, o.currency, "—")}</td>
                    <td className="font-extrabold">{money(o.priceMax, o.currency, "—")}</td>
                    <td className="max-w-[220px] text-ink-soft">{o.notes ?? "—"}</td>
                    <td className="whitespace-nowrap">{date(o.observedAt)} {isOlderThan(o.observedAt, STALE_DAYS) ? <span className="badge-warn ml-1">May be out of date</span> : null}</td>
                  </tr>
                ))}
                {visible.length === 0 ? <tr><td colSpan={8} className="text-ink-muted">No published observations for this product yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {hidden > 0 ? (
            <div className="border-t border-line">
              <Gate title="See prices from every market" text="Members compare all districts and see price history." modalTitle="Subscribe to compare every market" teaser={<div className="h-40" />} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

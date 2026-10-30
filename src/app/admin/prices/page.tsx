import { prisma } from "@/lib/prisma";
import { date, isOlderThan, moneyRange } from "@/lib/format";
import { addMarket, addObservation, addProduct } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prices" };

export default async function AdminPricesPage({ searchParams }: { searchParams: { error?: string; added?: string } }) {
  const [markets, products, districts, recent] = await Promise.all([
    prisma.market.findMany({ include: { location: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { type: "DISTRICT" }, orderBy: { name: "asc" } }),
    prisma.priceObservation.findMany({ include: { market: true, product: true, collector: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div><h1 className="font-display text-[22px] font-bold tracking-tight text-heading">Market prices</h1><p className="text-sm text-ink-muted">Add dated observations. Old observations are kept as history and never overwritten.</p></div>
      {searchParams.error ? <p role="alert" className="rounded-xl bg-bad-bg p-4 text-sm font-semibold text-bad-fg">{searchParams.error}</p> : null}
      {searchParams.added ? <p role="status" className="rounded-xl bg-brand-tint p-4 text-sm font-bold text-brand-dark">Observation added.</p> : null}

      <form action={addObservation} className="card flex flex-col gap-4 p-6">
        <h2 className="text-lg font-bold">Add an observation</h2>
        <div className="flex flex-wrap gap-3.5">
          <label className="label flex-[1_1_220px]">Market<select name="marketId" required className="input">{markets.map((m) => <option key={m.id} value={m.id}>{m.name}{m.location ? `, ${m.location.name}` : ""}</option>)}</select></label>
          <label className="label flex-[1_1_220px]">Product<select name="productId" required className="input">{products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.grade ? `, ${p.grade}` : ""}{p.standardUnit ? ` (${p.standardUnit})` : ""}</option>)}</select></label>
          <label className="label flex-[1_1_160px]">Observed on<input name="observedAt" type="date" required defaultValue={today} max={today} className="input" /></label>
          <label className="label flex-[1_1_160px]">Price type<select name="priceType" className="input"><option value="WHOLESALE">Wholesale</option><option value="RETAIL">Retail</option><option value="FARM_GATE">Farm-gate</option></select></label>
        </div>
        <div className="flex flex-wrap gap-3.5">
          <label className="label flex-[1_1_160px]">Min price<input name="priceMin" inputMode="numeric" className="input" /></label>
          <label className="label flex-[1_1_160px]">Max price<input name="priceMax" inputMode="numeric" className="input" /></label>
          <label className="label flex-[0_1_100px]">Currency<input name="currency" defaultValue="UGX" className="input" /></label>
          <label className="label flex-[1_1_180px]">Quoted unit<input name="quotedUnit" required placeholder="Must match the product's unit to compare" className="input" /></label>
          <label className="label flex-[1_1_140px]">Grade<input name="grade" className="input" /></label>
          <label className="label flex-[1_1_140px]">Package size<input name="packageSize" className="input" /></label>
        </div>
        <div className="flex flex-wrap gap-3.5">
          <label className="label flex-[1_1_140px]">Number of quotes<input name="quoteCount" inputMode="numeric" className="input" /></label>
          <label className="label flex-[1_1_200px]">Collection method<input name="collectionMethod" placeholder="market visit, phone survey…" className="input" /></label>
          <label className="label flex-[1_1_140px]">Includes tax<select name="includesTax" className="input"><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></label>
          <label className="label flex-[1_1_140px]">Includes transport<select name="includesTransport" className="input"><option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></label>
        </div>
        <label className="label">Remark<input name="notes" className="input" /></label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publish" className="h-4 w-4 accent-brand" />Publish now (I checked the evidence). Otherwise it goes to the review queue.</label>
          <button className="btn-primary">Add observation</button>
        </div>
      </form>

      <div className="flex flex-wrap gap-5">
        <form action={addMarket} className="card flex flex-[1_1_380px] flex-col gap-3 p-6">
          <h2 className="text-lg font-bold">Add a market</h2>
          <input name="name" required placeholder="Market name" aria-label="Market name" className="input" />
          <input name="marketType" placeholder="Type (wholesale, retail, livestock…)" aria-label="Market type" className="input" />
          <select name="locationId" aria-label="District" className="input"><option value="">District…</option>{districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <input name="town" placeholder="Town" aria-label="Town" className="input" />
          <button className="btn-outline self-end">Add market</button>
        </form>
        <form action={addProduct} className="card flex flex-[1_1_380px] flex-col gap-3 p-6">
          <h2 className="text-lg font-bold">Add a product</h2>
          <input name="name" required placeholder="Product name" aria-label="Product name" className="input" />
          <input name="variety" placeholder="Variety" aria-label="Variety" className="input" />
          <input name="grade" placeholder="Grade" aria-label="Grade" className="input" />
          <input name="standardUnit" placeholder="Standard unit, e.g. 50 kg bag" aria-label="Standard unit" className="input" />
          <input name="localNames" placeholder="Local names, comma-separated" aria-label="Local names" className="input" />
          <button className="btn-outline self-end">Add product</button>
        </form>
      </div>

      <section className="card overflow-hidden">
        <h2 className="p-5 text-lg font-bold">Recent observations</h2>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead><tr><th>Product</th><th>Market</th><th>Min – max price</th><th>Unit</th><th>Observed</th><th>Status</th><th>By</th></tr></thead>
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
                </tr>
              ))}
              {recent.length === 0 ? <tr><td colSpan={7} className="text-ink-muted">No observations yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

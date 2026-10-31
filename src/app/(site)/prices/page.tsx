import { CalendarDays, Info, MapPin, Store, TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, isOlderThan, money, moneyRange } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { AutoSubmit } from "@/components/AutoSubmit";
import { Icon } from "@/components/Icon";
import type { PriceType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Market prices" };

const STALE_DAYS = 30;
const TYPES: [PriceType, string][] = [["WHOLESALE", "Wholesale"], ["RETAIL", "Retail"], ["FARM_GATE", "Farm-gate"]];

/**
 * Markets and prices: pick a product and price type, then compare the latest dated price from
 * each market. Same deep navy header as the directory pages. Summary figures use only the rows
 * this viewer can see, so they never reveal member prices. Phones get one card per market
 * instead of a wide table.
 */
export default async function PricesPage({ searchParams }: { searchParams: { product?: string; type?: string } }) {
  const viewer = await getViewer();
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  const product = products.find((p) => p.id === searchParams.product) ?? products[0];
  const priceType = (TYPES.some(([k]) => k === searchParams.type) ? searchParams.type : "WHOLESALE") as PriceType;

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

  const productName = product ? `${product.name}${product.grade ? `, ${product.grade}` : ""}` : "";
  const place = (o: (typeof rows)[number]) => {
    const l = o.market.location;
    const district = l?.type === "DISTRICT" ? l.name : null;
    const country = l?.type === "DISTRICT" ? l.parent?.name : l?.name;
    return [district, country].filter(Boolean).join(", ") || "Location not added";
  };
  const range = (o: (typeof rows)[number]) => moneyRange(o.priceMin, o.priceMax, o.currency, "Not added");

  // Summary from the rows shown only.
  const mins = visible.map((o) => Number(o.priceMin ?? o.priceMax)).filter((n) => Number.isFinite(n));
  const maxs = visible.map((o) => Number(o.priceMax ?? o.priceMin)).filter((n) => Number.isFinite(n));
  const currency = visible[0]?.currency ?? "UGX";
  const latest = visible.reduce<Date | null>((d, o) => (!d || o.observedAt > d ? o.observedAt : d), null);
  const stats: [React.ReactNode, string, string, React.ReactNode][] = [
    [<TrendingDown key="l" className="h-5 w-5" />, "Lowest price", mins.length ? money(Math.min(...mins), currency) : "—", unit ? `per ${unit}` : ""],
    [<TrendingUp key="h" className="h-5 w-5" />, "Highest price", maxs.length ? money(Math.max(...maxs), currency) : "—", unit ? `per ${unit}` : ""],
    [<Store key="m" className="h-5 w-5" />, "Markets", String(comparable.length), viewer.isMember || hidden === 0 ? "compared" : `${visible.length} shown free`],
    [<CalendarDays key="d" className="h-5 w-5" />, "Latest price", latest ? date(latest) : "—", "observed"],
  ];

  return (
    <>
      {/* ── Header: deep navy band with the product and price type pickers ── */}
      <header className="bg-[#071A33] text-white">
        <div className="container-site flex flex-col gap-6 py-9 sm:py-12">
          <div className="flex max-w-3xl flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] py-1 pl-1.5 pr-3 text-xs font-semibold text-white/90">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink"><Icon name="prices" className="h-3 w-3" /></span>
              {products.length} {products.length === 1 ? "product" : "products"} tracked
            </span>
            <h1 className="text-page-title">Market prices</h1>
            <p className="text-[15px] leading-relaxed text-white/75 sm:text-base">Dated price observations from markets across Uganda. Every price shows when it was observed.</p>
          </div>

          <form className="grid max-w-4xl gap-3 rounded-2xl border border-line bg-white p-3 text-ink sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-4">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-ink-muted">Product
              <select name="product" defaultValue={product?.id} className="min-h-[48px] w-full rounded-xl border border-line bg-page px-3 text-[15px] font-semibold text-ink outline-none focus:border-brand">
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.grade ? `, ${p.grade}` : ""}{p.standardUnit ? ` (${p.standardUnit})` : ""}</option>)}
              </select>
            </label>
            <fieldset className="flex min-w-0 flex-col gap-1">
              <legend className="mb-1 text-xs font-semibold text-ink-muted">Price type</legend>
              {/* Segmented control: radios restyled as pills; AutoSubmit reloads on change */}
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-page p-1">
                {TYPES.map(([k, label]) => (
                  <label key={k} className="cursor-pointer">
                    <input type="radio" name="type" value={k} defaultChecked={k === priceType} data-auto="" className="peer sr-only" />
                    <span className="flex min-h-[40px] items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-ink-soft peer-checked:bg-white peer-checked:text-heading peer-checked:shadow-[0_1px_3px_rgba(7,26,51,0.15)] peer-focus-visible:ring-2 peer-focus-visible:ring-brand">{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <AutoSubmit />
            <noscript><button className="btn-primary">Show prices</button></noscript>
          </form>
        </div>
      </header>

      <div className="bg-page">
        <div className="container-site flex flex-col gap-6 py-8 sm:py-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-block-title text-heading">{productName || "No products yet"}</h2>
            <p className="inline-flex items-start gap-1.5 text-sm text-ink-muted"><Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />{TYPES.find(([k]) => k === priceType)?.[1]} prices. Only markets with the same grade and unit{unit ? ` (${unit})` : ""} are compared.</p>
          </div>

          {/* Summary */}
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(([icon, label, value, note]) => (
              <li key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 sm:p-4">
                <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand sm:flex">{icon}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-xs text-ink-muted">{label}</span>
                  <span className="truncate font-display text-[15px] font-bold text-heading sm:text-lg">{value}</span>
                  {note ? <span className="truncate text-[11px] text-ink-muted">{note}</span> : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            {/* Desktop and tablet: one row per market */}
            <table className="hidden w-full text-[15px] md:table">
              <thead>
                <tr className="border-b border-line bg-page text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3">Market</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Price ({unit ?? "unit"})</th><th className="px-5 py-3">Remark</th><th className="px-5 py-3">Observed</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => (
                  <tr key={o.id} className="border-b border-line last:border-0 hover:bg-page/60">
                    <td className="px-5 py-4 font-bold text-heading">{o.market.name}</td>
                    <td className="px-5 py-4 text-ink-soft">{place(o)}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-display font-bold text-heading">{range(o)}</td>
                    <td className="max-w-[260px] px-5 py-4 text-sm text-ink-muted">{o.notes ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm">{date(o.observedAt)}{isOlderThan(o.observedAt, STALE_DAYS) ? <span className="badge-warn ml-2">May be out of date</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phones: one card per market */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map((o) => (
                <li key={o.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-bold text-heading">{o.market.name}</span>
                      <span className="inline-flex items-center gap-1 text-[13px] text-ink-muted"><MapPin aria-hidden className="h-3.5 w-3.5" />{place(o)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-base font-bold text-heading">{range(o)}</span>
                      <span className="text-[11px] text-ink-muted">per {o.quotedUnit}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden className="h-3.5 w-3.5" />Observed {date(o.observedAt)}</span>
                    {isOlderThan(o.observedAt, STALE_DAYS) ? <span className="badge-warn">May be out of date</span> : null}
                  </div>
                  {o.notes ? <p className="text-xs text-ink-soft">{o.notes}</p> : null}
                </li>
              ))}
            </ul>

            {visible.length === 0 ? <p className="px-5 py-10 text-center text-sm text-ink-muted">No published prices for this product and price type yet.</p> : null}

            {hidden > 0 ? (
              <div className="border-t border-line bg-page/50 py-2">
                <Gate title="See prices from every market" text={`${hidden} more ${hidden === 1 ? "market" : "markets"}. Members compare all districts and see price history.`} modalTitle="Subscribe to compare every market" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

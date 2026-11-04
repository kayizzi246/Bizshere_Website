import Link from "next/link";
import { ArrowUpDown, Search, Store } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, isOlderThan, money, moneyRange } from "@/lib/format";
import { PriceBoard, type BoardRow, type MarketPrice } from "@/components/PriceBoard";
import type { PriceType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Markets and Prices" };

const STALE_DAYS = 30;
const TYPES: [PriceType, string][] = [["WHOLESALE", "Wholesale"], ["RETAIL", "Retail"], ["FARM_GATE", "Farm-gate"]];
// Icon colours for the product initials, picked by name so each product keeps its colour.
const TONES = ["bg-[#F7931A]", "bg-[#627EEA]", "bg-[#26A17B]", "bg-[#F3BA2F]", "bg-[#2775CA]", "bg-brand", "bg-accent", "bg-[#8B5CF6]"];

/**
 * Markets and Prices as a price board: one dark list with every product's latest price and its
 * change since the previous observation (green up, red down). A row of market tabs ("All markets",
 * "Owino Market – Kampala"…) and the same choice in the search bar show one market's products.
 * Tapping a product opens a pop-up: members see every market's price (src/components/PriceBoard.tsx),
 * everyone else the sign-up and payment pop-up.
 *
 * Headline prices and changes come only from markets this viewer may see (visitors: the first
 * FREE_PREVIEW.markets per product), so they never reveal member prices. A visitor who picks a
 * market outside a product's free preview sees the product with "Members only" instead of a price.
 */
const SORTS = [["name", "A to Z"], ["price-high", "Highest price"], ["price-low", "Lowest price"], ["rising", "Biggest rise"], ["falling", "Biggest fall"], ["recent", "Recently updated"]] as const;
type Sort = (typeof SORTS)[number][0];

export default async function PricesPage({ searchParams }: { searchParams: { type?: string; q?: string; market?: string; sort?: string } }) {
  const viewer = await getViewer();
  const priceType = (TYPES.some(([k]) => k === searchParams.type) ? searchParams.type : "WHOLESALE") as PriceType;
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const sort: Sort = SORTS.some(([k]) => k === searchParams.sort) ? (searchParams.sort as Sort) : "name";

  const [products, observations] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.priceObservation.findMany({
      where: { priceType, status: "PUBLISHED" },
      include: { market: { include: { location: { include: { parent: true } } } } },
      orderBy: { observedAt: "desc" },
    }),
  ]);
  type Obs = (typeof observations)[number];

  // Where a market is: its district (or area), e.g. "Kampala".
  const placeName = (o: Obs) => o.market.location?.name ?? null;
  // The markets with prices of this type, for the tabs and the search bar: "Owino Market – Kampala".
  const marketList = new Map<string, { label: string; products: Set<string> }>();
  for (const o of observations) {
    const m = marketList.get(o.marketId) ?? { label: [o.market.name, placeName(o)].filter(Boolean).join(" – "), products: new Set<string>() };
    m.products.add(o.productId);
    marketList.set(o.marketId, m);
  }
  const markets = [...marketList].sort((a, b) => a[1].label.localeCompare(b[1].label));
  const market = marketList.has(searchParams.market ?? "") ? searchParams.market! : "";
  const marketLabel = market ? marketList.get(market)!.label : null;

  // Search: every word must appear in the product name, local names, variety or grade.
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shownProducts = products.filter((p) =>
    words.every((w) => [p.name, p.variety, p.grade, ...p.localNames].filter(Boolean).join(" ").toLowerCase().includes(w))
    && (!market || marketList.get(market)!.products.has(p.id)));

  // Per product, per market: the latest observation and the one before it (same unit only).
  // Markets are kept newest first, so the first FREE_PREVIEW.markets are the visitor's free preview.
  const byProduct = new Map<string, Map<string, Obs[]>>();
  for (const o of observations) {
    const p = products.find((x) => x.id === o.productId);
    if (p?.standardUnit && o.quotedUnit !== p.standardUnit) continue; // like-for-like units only
    const perMarket = byProduct.get(o.productId) ?? new Map<string, Obs[]>();
    const list = perMarket.get(o.marketId) ?? [];
    if (list.length < 2) list.push(o);
    perMarket.set(o.marketId, list);
    byProduct.set(o.productId, perMarket);
  }
  const mid = (o: Obs) => {
    const a = Number(o.priceMin ?? o.priceMax), b = Number(o.priceMax ?? o.priceMin);
    return Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : null;
  };

  const board = shownProducts.map((p) => {
    const all = [...(byProduct.get(p.id)?.entries() ?? [])];
    const free = new Set(all.slice(0, FREE_PREVIEW.markets).map(([id]) => id));
    const inScope = market ? all.filter(([id]) => id === market) : all;
    const seen = (viewer.isMember ? inScope : inScope.filter(([id]) => free.has(id))).map(([, list]) => list);
    const now = seen.map((m) => mid(m[0])).filter((n): n is number => n !== null);
    const changes = seen.filter((m) => m[1]).map((m) => { const a = mid(m[1]), b = mid(m[0]); return a && b ? ((b - a) / a) * 100 : null; }).filter((n): n is number => n !== null);
    return {
      p,
      name: `${p.name}${p.grade ? `, ${p.grade}` : ""}`,
      price: now.length ? now.reduce((s, n) => s + n, 0) / now.length : null,
      locked: inScope.length > 0 && seen.length === 0,
      currency: seen[0]?.[0].currency ?? "UGX",
      change: changes.length ? changes.reduce((s, n) => s + n, 0) / changes.length : null,
      latest: inScope.reduce<Date | null>((d, [, m]) => (!d || m[0].observedAt > d ? m[0].observedAt : d), null),
      markets: all.length,
    };
  });
  const bySort: Record<Sort, (a: (typeof board)[number], b: (typeof board)[number]) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    "price-high": (a, b) => (b.price ?? -1) - (a.price ?? -1),
    "price-low": (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
    rising: (a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity),
    falling: (a, b) => (a.change ?? Infinity) - (b.change ?? Infinity),
    recent: (a, b) => (b.latest?.getTime() ?? 0) - (a.latest?.getTime() ?? 0),
  };
  // Priced (or locked) products first, then the ones without a price yet.
  const rows = [...board].sort((a, b) => (a.price === null && !a.locked ? 1 : 0) - (b.price === null && !b.locked ? 1 : 0) || bySort[sort](a, b));

  // Links keep the search, market and sort.
  const href = (set: { market?: string; type?: string }) => {
    const p = new URLSearchParams();
    const m = set.market ?? market, t = set.type ?? priceType;
    if (m) p.set("market", m);
    if (t !== "WHOLESALE") p.set("type", t);
    if (q) p.set("q", q);
    if (sort !== "name") p.set("sort", sort);
    const s = p.toString();
    return `/prices${s ? `?${s}` : ""}`;
  };

  const place = (o: Obs) => {
    const l = o.market.location;
    const district = l?.type === "DISTRICT" ? l.name : null;
    const country = l?.type === "DISTRICT" ? l.parent?.name : l?.name;
    return [district, country].filter(Boolean).join(", ") || "Location not added";
  };

  const boardRows: BoardRow[] = rows.map((r) => ({
    id: r.p.id,
    name: r.name,
    initial: r.p.name.charAt(0),
    tone: TONES[[...r.p.name].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length],
    sub: `${r.p.standardUnit ? `per ${r.p.standardUnit}` : "price"}${marketLabel ? ` · ${marketLabel}` : r.markets ? ` · ${r.markets} ${r.markets === 1 ? "market" : "markets"}` : ""}${r.latest ? ` · updated ${date(r.latest)}` : ""}`,
    price: r.price !== null ? money(Math.round(r.price), r.currency) : null,
    change: r.change,
    locked: r.locked,
  }));
  // Members only: every market's latest price per product, for the pop-up. Visitors get none.
  const details: Record<string, MarketPrice[]> | null = viewer.isMember
    ? Object.fromEntries(rows.map((r) => [r.p.id, [...(byProduct.get(r.p.id)?.values() ?? [])].map((m) => m[0]).map((o) => ({
        id: o.id, market: o.market.name, place: place(o), observed: date(o.observedAt),
        range: moneyRange(o.priceMin, o.priceMax, o.currency, "Not added"), stale: isOlderThan(o.observedAt, STALE_DAYS),
      }))]))
    : null;

  const select = "h-11 w-full cursor-pointer appearance-none bg-transparent pl-9 pr-3 text-[14px] font-semibold text-white outline-none";
  const tab = (on: boolean) => `whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold ${on ? "bg-white/[0.12] text-white hover:text-white" : "text-white/80 hover:bg-white/[0.06] hover:text-white"}`;

  // One dark page from the very top: title, tabs and the board share the same background.
  return (
    // under-header: the black runs up behind the floating header to the top of the screen.
    <div className="under-header bg-[#0A0B0D] text-white">
      <div className="container-site flex flex-col gap-4 py-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-hero text-[38px] text-white sm:text-[52px] xl:text-[60px]">Markets and Prices</h1>
          <p className="text-[14px] text-white/55">Latest dated prices from markets across Uganda. Pick a market to see its products, or tap a product to see every market.</p>
        </div>

        {/* Advanced search: product words, market and sort in one bar (a plain GET form) */}
        <form action="/prices" role="search" className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.06] p-1.5 sm:flex sm:items-center">
          {priceType !== "WHOLESALE" ? <input type="hidden" name="type" value={priceType} /> : null}
          <label className="relative col-span-2 min-w-0 sm:flex-1">
            <span className="sr-only">Search products</span>
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input name="q" type="search" defaultValue={q} placeholder="Search products, e.g. maize, matooke, sugar" className="h-11 w-full rounded-xl bg-transparent pl-10 pr-3 text-[15px] text-white outline-none placeholder:text-white/40" />
          </label>
          <label className="relative rounded-xl bg-white/[0.06] sm:w-60 sm:rounded-none sm:border-l sm:border-white/10 sm:bg-transparent">
            <span className="sr-only">Market</span>
            <Store aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <select name="market" defaultValue={market} className={select}>
              <option value="" className="text-ink">All markets</option>
              {markets.map(([id, m]) => <option key={id} value={id} className="text-ink">{m.label}</option>)}
            </select>
          </label>
          <label className="relative rounded-xl bg-white/[0.06] sm:w-48 sm:rounded-none sm:border-l sm:border-white/10 sm:bg-transparent">
            <span className="sr-only">Sort by</span>
            <ArrowUpDown aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <select name="sort" defaultValue={sort} className={select}>
              {SORTS.map(([k, label]) => <option key={k} value={k} className="text-ink">{label}</option>)}
            </select>
          </label>
          <button className="col-span-2 h-11 rounded-xl bg-accent px-6 text-[15px] font-bold text-ink hover:bg-white sm:ml-1">Search</button>
        </form>
        {q || marketLabel ? (
          <p className="-mt-1 flex flex-wrap items-center gap-2 text-[13px] text-white/60">
            Showing {rows.length} {rows.length === 1 ? "product" : "products"}{q ? <> for <strong className="text-white">“{q}”</strong></> : null}{marketLabel ? <> at <strong className="text-white">{marketLabel}</strong></> : null}.
            <Link href={`/prices${priceType !== "WHOLESALE" ? `?type=${priceType}` : ""}`} className="font-semibold text-accent hover:text-white">Clear</Link>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Markets: tap one to see what it sells and at what price */}
          <nav aria-label="Markets" className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={href({ market: "" })} scroll={false} aria-current={!market ? "page" : undefined} className={tab(!market)}>All markets</Link>
            {markets.map(([id, m]) => (
              <Link key={id} href={href({ market: id })} scroll={false} aria-current={id === market ? "page" : undefined} className={tab(id === market)}>{m.label}</Link>
            ))}
          </nav>
          <nav aria-label="Price type" className="flex gap-1 rounded-full bg-white/[0.06] p-1">
            {TYPES.map(([k, label]) => (
              <Link key={k} href={href({ type: k, market: "" })} scroll={false} aria-current={k === priceType ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold ${k === priceType ? "bg-white text-[#0A0B0D] hover:text-[#0A0B0D]" : "text-white/70 hover:text-white"}`}>{label}</Link>
            ))}
          </nav>
        </div>

        <section aria-label="Prices" className="border-t border-white/10 pt-2">
          {boardRows.length ? (
            <PriceBoard rows={boardRows} details={details} unitLabel={TYPES.find(([k]) => k === priceType)?.[1] ?? ""} />
          ) : (
            <p className="px-3 py-10 text-center text-sm text-white/60">{q ? "No products match this search." : market ? "No prices from this market yet." : "Nothing here for this price type yet."}</p>
          )}
        </section>
        <p className="text-[11px] text-white/40">{market ? "Latest price at this market." : "Average of the latest price in each market."} Change is since the previous price.{viewer.isMember ? "" : " Members see every market."}</p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpDown, Search, Store } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, isOlderThan, money, moneyRange } from "@/lib/format";
import { GlassSelect } from "@/components/GlassSelect";
import { PriceBoard, type BoardPrice, type BoardRow, type MarketPrice } from "@/components/PriceBoard";
import type { PriceType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Markets and Prices" };

const STALE_DAYS = 30;
const TYPE_LABEL: Record<PriceType, string> = { WHOLESALE: "Wholesale", RETAIL: "Retail", FARM_GATE: "Farm-gate" };
// The change and the price sorts follow the first of these the product has.
const HEADLINE: PriceType[] = ["WHOLESALE", "RETAIL", "FARM_GATE"];
// Icon colours for the product initials, picked by name so each product keeps its colour.
const TONES = ["bg-[#F7931A]", "bg-[#627EEA]", "bg-[#26A17B]", "bg-[#F3BA2F]", "bg-[#2775CA]", "bg-brand", "bg-accent", "bg-[#8B5CF6]"];

/**
 * Markets and Prices as one price table: a row per product with its wholesale, retail and farm-gate
 * price side by side, the change since the previous price and the last update (src/components/PriceBoard.tsx).
 * A row of market tabs ("All markets", "Owino Market – Kampala"…) and the same choice in the search
 * bar show one market's products. Tapping a product opens a pop-up: members see every market's
 * price, everyone else the sign-up and payment pop-up.
 *
 * Prices and changes come only from markets this viewer may see (visitors: the first
 * FREE_PREVIEW.markets per product and price type), so they never reveal member prices. A visitor
 * who picks a market outside that preview sees "Members" instead of the price.
 */
const SORTS = [["name", "A to Z"], ["price-high", "Highest price"], ["price-low", "Lowest price"], ["rising", "Biggest rise"], ["falling", "Biggest fall"], ["recent", "Recently updated"]] as const;
type Sort = (typeof SORTS)[number][0];

export default async function PricesPage({ searchParams }: { searchParams: { q?: string; market?: string; sort?: string } }) {
  const viewer = await getViewer();
  const q = (searchParams.q ?? "").trim().slice(0, 80);
  const sort: Sort = SORTS.some(([k]) => k === searchParams.sort) ? (searchParams.sort as Sort) : "name";

  const [products, observations] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.priceObservation.findMany({
      where: { status: "PUBLISHED" },
      include: { market: { include: { location: { include: { parent: true } } } } },
      orderBy: { observedAt: "desc" },
    }),
  ]);
  type Obs = (typeof observations)[number];

  // The markets with prices, for the tabs and the search bar: "Owino Market – Kampala".
  const marketList = new Map<string, { label: string; products: Set<string> }>();
  for (const o of observations) {
    const m = marketList.get(o.marketId) ?? { label: [o.market.name, o.market.location?.name].filter(Boolean).join(" – "), products: new Set<string>() };
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

  // Per product, per price type, per market: the latest observation and the one before it (same
  // unit only). Markets are kept newest first: the first FREE_PREVIEW.markets are the free preview.
  const byProduct = new Map<string, Map<PriceType, Map<string, Obs[]>>>();
  for (const o of observations) {
    const p = products.find((x) => x.id === o.productId);
    if (p?.standardUnit && o.quotedUnit !== p.standardUnit) continue; // like-for-like units only
    const types = byProduct.get(o.productId) ?? new Map<PriceType, Map<string, Obs[]>>();
    const perMarket = types.get(o.priceType) ?? new Map<string, Obs[]>();
    const list = perMarket.get(o.marketId) ?? [];
    if (list.length < 2) list.push(o);
    perMarket.set(o.marketId, list);
    types.set(o.priceType, perMarket);
    byProduct.set(o.productId, types);
  }
  const mid = (o: Obs) => {
    const a = Number(o.priceMin ?? o.priceMax), b = Number(o.priceMax ?? o.priceMin);
    return Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : null;
  };
  const avg = (ns: number[]) => (ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : null);

  /** One product, one price type: the average price and change over the markets this viewer may see. */
  const summarise = (perMarket: Map<string, Obs[]> | undefined) => {
    const all = [...(perMarket?.entries() ?? [])];
    const free = new Set(all.slice(0, FREE_PREVIEW.markets).map(([id]) => id));
    const inScope = market ? all.filter(([id]) => id === market) : all;
    const seen = (viewer.isMember ? inScope : inScope.filter(([id]) => free.has(id))).map(([, list]) => list);
    const price = avg(seen.map((m) => mid(m[0])).filter((n): n is number => n !== null));
    const change = avg(seen.filter((m) => m[1]).map((m) => { const a = mid(m[1]), b = mid(m[0]); return a && b ? ((b - a) / a) * 100 : null; }).filter((n): n is number => n !== null));
    const latest = inScope.reduce<Date | null>((d, [, m]) => (!d || m[0].observedAt > d ? m[0].observedAt : d), null);
    return { price, change, latest, locked: inScope.length > 0 && seen.length === 0, currency: seen[0]?.[0].currency ?? "UGX", markets: new Set(all.map(([id]) => id)) };
  };

  const board = shownProducts.map((p) => {
    const types = byProduct.get(p.id);
    const by = Object.fromEntries(HEADLINE.map((t) => [t, summarise(types?.get(t))])) as Record<PriceType, ReturnType<typeof summarise>>;
    const headType = HEADLINE.find((t) => by[t].price !== null) ?? HEADLINE.find((t) => by[t].locked) ?? null;
    const head = headType ? by[headType] : null;
    const latest = HEADLINE.map((t) => by[t].latest).filter((d): d is Date => Boolean(d)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const marketCount = new Set(HEADLINE.flatMap((t) => [...by[t].markets])).size;
    return { p, by, head, headType, name: `${p.name}${p.grade ? `, ${p.grade}` : ""}`, price: head?.price ?? null, change: head?.change ?? null, latest, marketCount, any: HEADLINE.some((t) => by[t].price !== null || by[t].locked) };
  });
  const bySort: Record<Sort, (a: (typeof board)[number], b: (typeof board)[number]) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    "price-high": (a, b) => (b.price ?? -1) - (a.price ?? -1),
    "price-low": (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity),
    rising: (a, b) => (b.change ?? -Infinity) - (a.change ?? -Infinity),
    falling: (a, b) => (a.change ?? Infinity) - (b.change ?? Infinity),
    recent: (a, b) => (b.latest?.getTime() ?? 0) - (a.latest?.getTime() ?? 0),
  };
  // Products with a price (or a locked one) first, then the ones without any yet.
  const rows = [...board].sort((a, b) => (a.any ? 0 : 1) - (b.any ? 0 : 1) || bySort[sort](a, b));

  // Links keep the search and sort.
  const href = (m: string) => {
    const p = new URLSearchParams();
    if (m) p.set("market", m);
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

  const priceCell = (s: ReturnType<typeof summarise>): BoardPrice => ({ value: s.price !== null ? money(Math.round(s.price), s.currency) : null, locked: s.locked });
  const boardRows: BoardRow[] = rows.map((r) => ({
    id: r.p.id,
    name: r.name,
    initial: r.p.name.charAt(0),
    tone: TONES[[...r.p.name].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length],
    sub: `${r.p.standardUnit ? `per ${r.p.standardUnit}` : "price"}${r.headType ? ` · ${TYPE_LABEL[r.headType]}` : ""}${marketLabel ? ` · ${marketLabel}` : r.marketCount ? ` · ${r.marketCount} ${r.marketCount === 1 ? "market" : "markets"}` : ""}`,
    price: r.head ? priceCell(r.head) : { value: null, locked: false },
    change: r.change,
    updated: r.latest ? date(r.latest) : null,
  }));
  // Members only: every market's latest price per product and type, for the pop-up. Visitors get none.
  const details: Record<string, MarketPrice[]> | null = viewer.isMember
    ? Object.fromEntries(rows.map((r) => [r.p.id, HEADLINE.flatMap((t) => [...(byProduct.get(r.p.id)?.get(t)?.values() ?? [])].map((m) => m[0])).map((o) => ({
        id: o.id, market: o.market.name, place: place(o), type: TYPE_LABEL[o.priceType], observed: date(o.observedAt),
        range: moneyRange(o.priceMin, o.priceMax, o.currency, "Not added"), stale: isOlderThan(o.observedAt, STALE_DAYS),
      }))]))
    : null;

  const select = "h-11 rounded-xl px-3 text-[14px] font-semibold text-white";
  const tab = (on: boolean) => `whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-bold ${on ? "bg-white text-[#0A0B0D] hover:text-[#0A0B0D]" : "bg-white/[0.06] text-white/80 hover:bg-white/[0.12] hover:text-white"}`;

  // One dark page from the very top: title, tabs and the table share the same background.
  return (
    // under-header: the black runs up behind the floating header to the top of the screen.
    <div className="under-header bg-[#0A0B0D] text-white">
      <div className="container-site flex flex-col gap-4 py-6 sm:py-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-hero text-[38px] text-white sm:text-[52px] xl:text-[60px]">Markets and Prices</h1>
          <p className="text-[14px] text-white/55">Latest dated wholesale, retail and farm-gate prices from markets across Uganda. Pick a market to see its products, or tap a product to see every market.</p>
        </div>

        {/* Advanced search: product words, market and sort in one bar (a plain GET form) */}
        <form action="/prices" role="search" className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.06] p-1.5 sm:flex sm:items-center">
          <label className="relative col-span-2 min-w-0 sm:flex-1">
            <span className="sr-only">Search products</span>
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input name="q" type="search" defaultValue={q} placeholder="Search products, e.g. maize, matooke, sugar" className="h-11 w-full rounded-xl bg-transparent pl-10 pr-3 text-[15px] text-white outline-none placeholder:text-white/40" />
          </label>
          <div className="rounded-xl bg-white/[0.06] sm:w-60 sm:rounded-none sm:border-l sm:border-white/10 sm:bg-transparent">
            <GlassSelect dark name="market" label="Market" defaultValue={market} className={select} icon={<Store className="h-4 w-4 text-accent" />}
              options={[{ value: "", label: "All markets" }, ...markets.map(([id, m]) => ({ value: id, label: m.label }))]} />
          </div>
          <div className="rounded-xl bg-white/[0.06] sm:w-48 sm:rounded-none sm:border-l sm:border-white/10 sm:bg-transparent">
            <GlassSelect dark name="sort" label="Sort by" defaultValue={sort} className={select} icon={<ArrowUpDown className="h-4 w-4 text-accent" />} panelClassName="right-0 left-auto"
              options={SORTS.map(([k, l]) => ({ value: k, label: l }))} />
          </div>
          <button className="col-span-2 h-11 rounded-xl bg-accent px-6 text-[15px] font-bold text-ink hover:bg-white sm:ml-1">Search</button>
        </form>
        {q || marketLabel ? (
          <p className="-mt-1 flex flex-wrap items-center gap-2 text-[13px] text-white/60">
            Showing {rows.length} {rows.length === 1 ? "product" : "products"}{q ? <> for <strong className="text-white">“{q}”</strong></> : null}{marketLabel ? <> at <strong className="text-white">{marketLabel}</strong></> : null}.
            <Link href="/prices" className="font-semibold text-accent hover:text-white">Clear</Link>
          </p>
        ) : null}

        {/* Markets: tap one to see what it sells and at what price */}
        <nav aria-label="Markets" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={href("")} scroll={false} aria-current={!market ? "page" : undefined} className={tab(!market)}>All markets</Link>
          {markets.map(([id, m]) => (
            <Link key={id} href={href(id)} scroll={false} aria-current={id === market ? "page" : undefined} className={tab(id === market)}>{m.label}</Link>
          ))}
        </nav>

        <section aria-label="Prices" className="border-t border-white/10 pt-3">
          {boardRows.length ? (
            <PriceBoard rows={boardRows} details={details} />
          ) : (
            <p className="px-3 py-10 text-center text-sm text-white/60">{q ? "No products match this search." : market ? "No prices from this market yet." : "No prices yet."}</p>
          )}
        </section>
        <p className="text-[11px] text-white/40">{market ? "Latest price at this market." : "Average of the latest price in each market."} Price is wholesale where there is one, otherwise retail, then farm-gate; the change is since the previous price.{viewer.isMember ? "" : " Members see every market."}</p>
      </div>
    </div>
  );
}

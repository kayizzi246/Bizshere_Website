import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import type { PriceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { date, isOlderThan, moneyRange } from "@/lib/format";
import { PriceListPdf } from "@/lib/price-list-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STALE_DAYS = 30; // as on /prices
const TYPE_LABEL: Record<PriceType, string> = { WHOLESALE: "Wholesale", RETAIL: "Retail", FARM_GATE: "Farm-gate" };
const TYPE_ORDER: PriceType[] = ["WHOLESALE", "RETAIL", "FARM_GATE"];
const OTHER = "Other products";

/**
 * GET /prices/[market id]/pdf: that market's latest published price for each product and price type,
 * grouped by category, as a PDF download. ?category= narrows it, as on the page. Members and staff
 * only: everyone else goes to the sign-up and payment pop-up and comes back to the market.
 */
export async function GET(req: Request, { params }: { params: { market: string } }) {
  const category = new URL(req.url).searchParams.get("category") ?? "";
  const back = `/prices?${new URLSearchParams({ market: params.market, ...(category ? { category } : {}) })}`;
  const viewer = await getViewer();
  if (!viewer.isMember) {
    // A relative address: behind a proxy req.url can hold the server's own host.
    return new Response(null, { status: 307, headers: { Location: `/membership?onboard=pay&next=${encodeURIComponent(back)}`, "Cache-Control": "private, no-store" } });
  }

  const market = await prisma.market.findUnique({ where: { id: params.market }, include: { location: { include: { parent: true } } } });
  if (!market) return new Response("Not found", { status: 404 });
  const observations = await prisma.priceObservation.findMany({
    where: { marketId: market.id, status: "PUBLISHED", ...(category ? { product: { categoryId: category } } : {}) },
    include: { product: { include: { category: { select: { name: true } } } } },
    orderBy: { observedAt: "desc" },
  });

  // The newest observation per product and price type, in the product's own unit (as on the page).
  const latest = new Map<string, (typeof observations)[number]>();
  for (const o of observations) {
    if (o.product.standardUnit && o.quotedUnit !== o.product.standardUnit) continue;
    const key = `${o.productId}:${o.priceType}`;
    if (!latest.has(key)) latest.set(key, o);
  }
  if (!latest.size) return new Response("No published prices for this market yet.", { status: 404 });

  const label = (o: (typeof observations)[number]) => [o.product.name, o.product.variety, o.product.grade].filter(Boolean).join(", ");
  const rows = [...latest.values()].sort((a, b) => label(a).localeCompare(label(b)) || TYPE_ORDER.indexOf(a.priceType) - TYPE_ORDER.indexOf(b.priceType));
  const byCategory = new Map<string, typeof rows>();
  for (const o of rows) {
    const name = o.product.category?.name ?? OTHER;
    byCategory.set(name, [...(byCategory.get(name) ?? []), o]);
  }
  const groups = [...byCategory].sort(([a], [b]) => Number(a === OTHER) - Number(b === OTHER) || a.localeCompare(b));

  const pdf = await renderToBuffer(<PriceListPdf d={{
    market: market.name,
    place: [market.town, market.location?.name, market.location?.parent?.name].filter((v, n, all): v is string => Boolean(v) && all.indexOf(v) === n).join(", ") || null,
    category: category ? rows[0].product.category?.name ?? null : null,
    logo: await readFile(path.join(process.cwd(), "public/brand/logo-full.png")).catch(() => null),
    printed: date(new Date()),
    url: `${process.env.NEXTAUTH_URL?.replace(/\/$/, "") || new URL(req.url).origin}${back}`,
    count: rows.length,
    staleDays: STALE_DAYS,
    groups: groups.map(([name, list]) => ({
      name,
      lines: list.map((o) => ({
        product: label(o),
        unit: o.quotedUnit,
        type: TYPE_LABEL[o.priceType],
        price: moneyRange(o.priceMin, o.priceMax, o.currency, "Not added").replace("–", " – "),
        date: date(o.observedAt),
        stale: isOlderThan(o.observedAt, STALE_DAYS),
      })),
    })),
  }} />);

  const slug = market.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "market";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-price-list.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * Price watches: a member taps "Watch" on a product at /prices and is texted when its price
 * moves, or when a new supplier starts selling it.
 *
 * Why it earns its place: a watch gives a member a reason to come back and a reason to renew, and
 * every text carries the site's address. The watch itself is free to keep; only members are texted
 * (a lapsed member is reminded to renew by the win-back job instead).
 *
 * The price used is the same one /prices shows a member: the average of the latest wholesale price
 * in each market, in the product's standard unit only. Retail and farm-gate prices are left out,
 * so a watch always compares like with like.
 */
import { prisma } from "./prisma";

export type WatchedSnapshot = {
  productId: string;
  name: string;
  unit: string | null;
  currency: string;
  /** Average of the latest wholesale price per market, or null when there is none yet. */
  price: number | null;
  /** How many published suppliers list this product now. */
  suppliers: number;
};

/** The current price and supplier count for these products. One query set for all of them. */
export async function snapshot(productIds: string[]): Promise<Map<string, WatchedSnapshot>> {
  const out = new Map<string, WatchedSnapshot>();
  if (!productIds.length) return out;
  const [products, observations, listings] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, grade: true, standardUnit: true } }),
    prisma.priceObservation.findMany({
      where: { productId: { in: productIds }, priceType: "WHOLESALE", status: "PUBLISHED" },
      select: { productId: true, marketId: true, priceMin: true, priceMax: true, currency: true, quotedUnit: true, observedAt: true },
      orderBy: { observedAt: "desc" },
    }),
    prisma.supplierProductListing.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds }, status: "PUBLISHED", supplier: { contentItem: { publicationStatus: "PUBLISHED" } } },
      _count: { _all: true },
    }),
  ]);

  for (const p of products) {
    // The latest observation per market, in the product's own unit.
    const latest = new Map<string, (typeof observations)[number]>();
    for (const o of observations) {
      if (o.productId !== p.id) continue;
      if (p.standardUnit && o.quotedUnit !== p.standardUnit) continue;
      if (!latest.has(o.marketId)) latest.set(o.marketId, o); // observations come newest first
    }
    const mids = [...latest.values()]
      .map((o) => {
        const a = Number(o.priceMin ?? o.priceMax);
        const b = Number(o.priceMax ?? o.priceMin);
        return Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : null;
      })
      .filter((n): n is number => n !== null);
    out.set(p.id, {
      productId: p.id,
      name: `${p.name}${p.grade ? `, ${p.grade}` : ""}`,
      unit: p.standardUnit,
      currency: [...latest.values()][0]?.currency ?? "UGX",
      price: mids.length ? Math.round(mids.reduce((s, n) => s + n, 0) / mids.length) : null,
      suppliers: listings.find((l) => l.productId === p.id)?._count._all ?? 0,
    });
  }
  return out;
}

/** The products this person watches, for /prices and /account. */
export async function watchedProductIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.priceWatch.findMany({ where: { userId }, select: { productId: true } }).catch(() => []);
  return new Set(rows.map((r) => r.productId));
}

/**
 * Turns a watch on or off. A new watch starts from today's price, so the first text is about a
 * real move rather than the difference from whenever the product was added.
 */
export async function toggleWatch(userId: string, productId: string): Promise<{ watching: boolean }> {
  const existing = await prisma.priceWatch.findUnique({ where: { userId_productId: { userId, productId } }, select: { id: true } });
  if (existing) {
    await prisma.priceWatch.delete({ where: { id: existing.id } });
    return { watching: false };
  }
  const now = (await snapshot([productId])).get(productId);
  await prisma.priceWatch.create({
    data: { userId, productId, lastPrice: now?.price ?? null, lastSuppliers: now?.suppliers ?? 0 },
  });
  return { watching: true };
}

/** What /account shows under "Prices you watch". */
export async function watchList(userId: string) {
  const rows = await prisma.priceWatch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { productId: true, lastPrice: true } });
  const now = await snapshot(rows.map((r) => r.productId));
  return rows.flatMap((r) => {
    const s = now.get(r.productId);
    if (!s) return [];
    const was = r.lastPrice === null ? null : Number(r.lastPrice);
    const change = was && s.price ? ((s.price - was) / was) * 100 : null;
    return [{ ...s, change }];
  });
}

import { unstable_cache } from "next/cache";
import type { ContentType } from "@prisma/client";
import { prisma } from "./prisma";
import { liveSiteUpdates } from "./site-updates";

/**
 * Data that changes only when an editor saves something, cached between requests so
 * pages skip those database round trips. Every admin save calls revalidateTag(SITE_DATA)
 * (via its server action), so edits still show on the next page load. The 5-minute limit is
 * a safety net only.
 *
 * Cached values pass through JSON: dates arrive as strings and decimals as strings.
 * The format helpers (date(), money()) accept both.
 */
export const SITE_DATA = "site-data";
const opts = { tags: [SITE_DATA], revalidate: 300 };

export const cachedMemberPlan = unstable_cache(
  () => prisma.membershipPlan.findUnique({ where: { code: "member" } }),
  ["member-plan"], opts,
);

export const cachedSiteUpdates = unstable_cache(() => liveSiteUpdates(), ["site-updates"], opts);

export const cachedRecentGuides = unstable_cache(
  () => prisma.contentItem.findMany({
    where: { contentType: { in: ["GUIDE", "TOOL", "RECIPE", "NEWS"] as ContentType[] }, publicationStatus: "PUBLISHED" },
    orderBy: [{ lastReviewedAt: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }],
    take: 6,
  }),
  ["recent-guides"], opts,
);

/** Real numbers for the homepage hero: published records per type and the latest check date. */
export const cachedHomeStats = unstable_cache(
  async () => {
    const [byType, latest] = await Promise.all([
      prisma.contentItem.groupBy({ by: ["contentType"], where: { publicationStatus: "PUBLISHED" }, _count: { _all: true } }),
      prisma.contentItem.aggregate({ where: { publicationStatus: "PUBLISHED" }, _max: { lastReviewedAt: true } }),
    ]);
    const counts = Object.fromEntries(byType.map((r) => [r.contentType, r._count._all])) as Partial<Record<ContentType, number>>;
    return { counts, total: byType.reduce((n, r) => n + r._count._all, 0), lastChecked: latest._max.lastReviewedAt };
  },
  ["home-stats"], opts,
);

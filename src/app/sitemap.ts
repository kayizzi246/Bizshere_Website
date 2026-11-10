import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { site } from "@/config/site";
import { DIRECTORIES } from "@/config/directories";
import { itemHref } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Every public page for search engines: the homepage, the directory lists, the information pages
 * and every published record. Member-only pages are still listed: their preview is public, and
 * that preview is what brings people from Google.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await prisma.contentItem.findMany({
    where: { publicationStatus: "PUBLISHED", contentType: { not: "RECIPE" } },
    select: { slug: true, contentType: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 20_000,
  }).catch(() => []);

  const fixed: MetadataRoute.Sitemap = [
    { url: site.url, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    ...DIRECTORIES.map((d) => ({ url: `${site.url}${d.href}`, lastModified: new Date(), changeFrequency: "daily" as const, priority: 0.9 })),
    ...["/membership", "/opportunities", "/about", "/contact", "/methodology", "/suppliers/join", "/experts/join", "/terms", "/privacy"]
      .map((p) => ({ url: `${site.url}${p}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
  return [
    ...fixed,
    ...items.map((i) => ({ url: `${site.url}${itemHref(i)}`, lastModified: i.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}

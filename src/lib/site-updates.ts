import type { SiteUpdate } from "@prisma/client";
import { prisma } from "./prisma";
import { contentTypeLabel, itemHref } from "./format";

/** Updates the homepage marquee shows right now: switched on and inside their date window. */
export function liveSiteUpdates(now = new Date()) {
  return prisma.siteUpdate.findMany({
    where: {
      isActive: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 20,
  });
}

/** What the homepage ribbon shows: the live updates or, with none, the newest published listings, so it is never missing. */
export async function homeRibbon(): Promise<{ id: string; message: string; href: string | null; tag?: string }[]> {
  const live = await liveSiteUpdates();
  if (live.length) return live;
  // Titles every visitor already sees on the directory lists. Website names can be member-only addresses.
  const items = await prisma.contentItem.findMany({
    where: { publicationStatus: "PUBLISHED", contentType: { not: "WEBSITE" } },
    select: { id: true, title: true, slug: true, contentType: true },
    orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
    take: 12,
  });
  return items.map((i) => ({ id: i.id, message: i.title.replace(/^Sample:[ ]*/i, ""), tag: contentTypeLabel[i.contentType], href: itemHref(i) }));
}

export type UpdateState = "live" | "hidden" | "scheduled" | "ended";

export function updateState(u: Pick<SiteUpdate, "isActive" | "startsAt" | "endsAt">, now = new Date()): UpdateState {
  if (!u.isActive) return "hidden";
  if (u.startsAt && u.startsAt > now) return "scheduled";
  if (u.endsAt && u.endsAt < now) return "ended";
  return "live";
}

import type { SiteUpdate } from "@prisma/client";
import { prisma } from "./prisma";

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

export type UpdateState = "live" | "hidden" | "scheduled" | "ended";

export function updateState(u: Pick<SiteUpdate, "isActive" | "startsAt" | "endsAt">, now = new Date()): UpdateState {
  if (!u.isActive) return "hidden";
  if (u.startsAt && u.startsAt > now) return "scheduled";
  if (u.endsAt && u.endsAt < now) return "ended";
  return "live";
}

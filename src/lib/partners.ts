/**
 * Suppliers and experts who register themselves and pay for their listing ("partners").
 *
 *   /suppliers/join, /experts/join   confirm the phone, enter the details, pay
 *   /admin/partners                  the team checks a paid listing and puts it live
 *   src/lib/jobs.ts                  reminders, and hiding a listing that wasn't renewed
 *
 * Each has its own plan, priced at /admin/plans. These plans carry no `fullDetail` entitlement,
 * so paying for a listing never opens member content (getViewer in src/lib/access.ts).
 * Whether a person must pay is decided by having a listing subscription: sellers and experts the
 * team added themselves have none, so nothing changes for them.
 *
 * The listing moves through: DRAFT (registered) → IN_REVIEW (paid) → PUBLISHED (approved), and on
 * lapsing → ARCHIVED with the organization SUSPENDED, which the next payment puts straight back.
 */
import { prisma } from "./prisma";
import { PARTNER_CODES, type PartnerKind } from "./membership";

export type { PartnerKind };

export const PARTNER_INFO: Record<PartnerKind, { name: string; join: string; portal: string; login: string; contentType: "SUPPLIER" | "CONSULTANT" }> = {
  supplier: { name: "Supplier listing", join: "/suppliers/join", portal: "/supplier", login: "/suppliers/login", contentType: "SUPPLIER" },
  expert: { name: "Expert listing", join: "/experts/join", portal: "/expert", login: "/experts/login", contentType: "CONSULTANT" },
};

/** The listing plan, created the first time it's needed. Its prices start empty, for the team to set at /admin/plans. */
export function partnerPlan(kind: PartnerKind) {
  const code = PARTNER_CODES[kind];
  return prisma.membershipPlan.upsert({
    where: { code },
    update: {},
    create: { code, name: PARTNER_INFO[kind].name, audience: "BUSINESS", sortOrder: kind === "supplier" ? 20 : 21, entitlements: { listing: true } },
  });
}

/** Paid listings waiting for the team to check and approve them (/admin/partners). */
export function waitingPartners() {
  const inReview = { contentItem: { publicationStatus: "IN_REVIEW" as const } };
  return prisma.subscription.count({
    where: { plan: { code: { in: Object.values(PARTNER_CODES) } }, organization: { OR: [{ supplier: inReview }, { consultants: { some: inReview } }] } },
  });
}

/** The person's own supplier or expert record with its page, or null. */
export async function partnerOf(userId: string, kind: PartnerKind) {
  const contentItem = { select: { id: true, title: true, slug: true, publicationStatus: true } };
  const row = kind === "supplier"
    ? await prisma.supplier.findFirst({ where: { organization: { members: { some: { userId } } } }, select: { organizationId: true, contentItem } })
    : await prisma.consultant.findUnique({ where: { ownerId: userId }, select: { organizationId: true, contentItem } });
  return row ? { organizationId: row.organizationId, item: row.contentItem } : null;
}

/** Whether this person's listing is paid for. `required` is false for those the team added, who have no listing plan. */
export async function partnerAccess(userId: string, kind: PartnerKind) {
  const sub = await prisma.subscription.findFirst({ where: { userId, plan: { code: PARTNER_CODES[kind] } }, orderBy: { startedAt: "desc" } });
  const paid = Boolean(sub && sub.status === "ACTIVE" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date());
  return { required: Boolean(sub), paid, mustPay: Boolean(sub) && !paid, everPaid: Boolean(sub?.currentPeriodEnd), until: sub?.currentPeriodEnd ?? null };
}

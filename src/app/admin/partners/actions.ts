"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { notifyMember, PARTNER_CODES } from "@/lib/membership";

/** Puts a paid, checked listing live and tells its owner. Only a listing that is paid and waiting can be approved. */
export async function approvePartner(form: FormData) {
  const sub = await prisma.subscription.findUnique({
    where: { id: String(form.get("subscriptionId")) },
    include: {
      plan: { select: { code: true } },
      organization: { select: { id: true, supplier: { select: { contentItemId: true } }, consultants: { select: { contentItemId: true }, take: 1 } } },
    },
  });
  const expert = sub?.plan.code === PARTNER_CODES.expert;
  if (!sub || (!expert && sub.plan.code !== PARTNER_CODES.supplier)) redirect("/admin/partners");
  const staff = await requireArea(expert ? "experts" : "suppliers");
  const itemId = sub.organization?.supplier?.contentItemId ?? sub.organization?.consultants[0]?.contentItemId;
  const paid = sub.status === "ACTIVE" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date();
  if (!itemId || !paid) redirect("/admin/partners");

  const now = new Date();
  const moved = await prisma.contentItem.updateMany({ where: { id: itemId, publicationStatus: "IN_REVIEW" }, data: { publicationStatus: "PUBLISHED", publishedAt: now, lastReviewedAt: now, reviewedById: staff.id } });
  if (moved.count) {
    await prisma.organization.update({ where: { id: sub.organization!.id }, data: { status: "ACTIVE" } });
    await audit(staff.id, "partner.approved", "content_item", itemId);
    if (sub.userId) await notifyMember(sub.userId, { title: "Your page is live", text: "Your BizSphere-Ug page has been approved and is now live.", link: expert ? "/expert" : "/supplier" }).catch(() => {});
  }
  revalidatePath("/admin/partners");
  revalidatePath(expert ? "/experts" : "/suppliers");
  redirect("/admin/partners?saved=1");
}

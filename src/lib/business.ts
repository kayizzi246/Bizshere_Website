import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { requireBusiness } from "./access";

/** The signed-in user's organization (first one they belong to). */
export async function getMyOrganization() {
  const user = await requireBusiness();
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      organization: {
        include: {
          supplier: { include: { contentItem: { include: { checks: { orderBy: { checkedAt: "desc" } } } } } },
          subscriptions: { include: { plan: true }, orderBy: { startedAt: "desc" }, take: 1 },
          locations: { include: { location: true } },
        },
      },
    },
  });
  if (!membership) redirect("/join");
  return { user, org: membership.organization };
}

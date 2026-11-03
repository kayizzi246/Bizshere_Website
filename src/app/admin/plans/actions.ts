"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { SITE_DATA } from "@/lib/cached";

/** Admin sets the member plan's prices. An empty box means "not set yet" (shown as "Price coming soon"). */
export async function savePlanPrices(form: FormData) {
  const user = await requireArea("plans");
  const price = (k: string) => {
    const v = String(form.get(k) ?? "").replace(/[,\s]/g, "");
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };
  const data = { priceDaily: price("daily"), priceMonthly: price("monthly"), priceYearly: price("yearly") };
  if (Object.values(data).some((v) => Number.isNaN(v))) redirect("/admin/plans?error=1");
  await prisma.membershipPlan.update({ where: { id: String(form.get("id")) }, data });
  await audit(user.id, "plan.prices_updated", "membership_plan", String(form.get("id")), data);
  revalidateTag(SITE_DATA);
  revalidatePath("/membership");
  redirect("/admin/plans?saved=1");
}

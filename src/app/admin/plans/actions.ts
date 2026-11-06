"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { SITE_DATA } from "@/lib/cached";
import { PARTNER_PERIODS, PLAN_PERIODS, PRICE_FIELD } from "@/lib/billing";
import { PARTNER_CODES } from "@/lib/membership";

/** Admin sets a plan's prices (suppliers, experts, members). An empty box means that length isn't offered. */
export async function savePlanPrices(form: FormData) {
  const user = await requireArea("plans");
  const id = String(form.get("id"));
  const plan = await prisma.membershipPlan.findUnique({ where: { id }, select: { code: true } });
  if (!plan) redirect("/admin/plans?error=1");
  const price = (k: string) => {
    const v = String(form.get(k) ?? "").replace(/[,\s]/g, "");
    if (v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };
  // One box per length, named by its period. A listing is sold by other lengths than a membership.
  const listing = (Object.values(PARTNER_CODES) as string[]).includes(plan.code);
  const data = Object.fromEntries((listing ? PARTNER_PERIODS : PLAN_PERIODS).map((k) => [PRICE_FIELD[k], price(k)]));
  if (Object.values(data).some((v) => Number.isNaN(v))) redirect("/admin/plans?error=1");
  await prisma.membershipPlan.update({ where: { id }, data });
  await audit(user.id, "plan.prices_updated", "membership_plan", id, data);
  revalidateTag(SITE_DATA);
  revalidatePath("/membership");
  revalidatePath("/suppliers/join");
  revalidatePath("/experts/join");
  redirect("/admin/plans?saved=1");
}

"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { BillingPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { PLAN_PERIODS, PRICE_FIELD, periodEnd } from "@/lib/billing";
import { allow, LIMITS } from "@/lib/rate-limit";
import { pesapalConfigured, startCheckout } from "@/lib/payments";
import { phoneKey } from "@/lib/phone-codes";
import { ensureUsername } from "@/lib/pin-accounts";
import { partnerPaid, PERIOD_WORD } from "@/lib/membership";
import { PARTNER_INFO, partnerOf, partnerPlan, type PartnerKind } from "@/lib/partners";
import { cancelPayment, type CheckoutOutcome } from "./onboarding";

/**
 * Server side of supplier and expert registration (src/lib/partners.ts). The person has already
 * confirmed their phone with a texted code, so the session is the proof of whose number it is.
 * Everything is checked again here; the form only collects it.
 */
const kindOf = z.enum(["supplier", "expert"]);
const list = (v: string) => v.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 30);
const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "listing";

const details = z.object({
  name: z.string().trim().min(2).max(120),
  business: z.string().trim().max(160),
  country: z.string().trim().min(2).max(60),
  place: z.string().trim().max(80),
  what: z.string().trim().min(2).max(600),
  title: z.string().trim().max(120),
  pin: z.string().regex(/^\d{4}$/).or(z.literal("")),
  pinAgain: z.string(),
});

export async function registerPartner(form: FormData) {
  const kind = kindOf.safeParse(form.get("kind"));
  if (!kind.success) redirect("/");
  const info = PARTNER_INFO[kind.data];
  const session = await getSession();
  if (!session?.user?.id) redirect(info.join);
  const userId = session.user.id;
  const fail = (error: string): never => redirect(`${info.join}?error=${error}`);

  const text = (k: string) => String(form.get(k) ?? "");
  const parsed = details.safeParse({ name: text("name"), business: text("business"), country: text("country"), place: text("place"), what: text("what"), title: text("title"), pin: text("pin"), pinAgain: text("pinAgain") });
  if (!parsed.success) return fail("details");
  const d = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, passwordHash: true, role: true } });
  if (!user || user.role === "ADMIN" || user.role === "EDITOR") return fail("staff");
  // Sellers and experts sign in with their phone, so an account without one can't use the portal
  if (!user.phone) return fail("phone");
  if (!user.passwordHash && (!d.pin || d.pin !== d.pinAgain)) return fail("pin");
  if (await partnerOf(userId, kind.data)) redirect(info.join);
  if (!(await allow(`partner:user:${userId}`, ...LIMITS.checkoutPerUser))) return fail("busy");

  const plan = await partnerPlan(kind.data);
  const pinHash = !user.passwordHash ? await bcrypt.hash(d.pin, 10) : null;
  const slug = `${slugOf(d.name)}-${randomInt(1000, 9999)}`;
  const phone = user.phone;

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { legalName: d.business || d.name, accountType: kind.data === "supplier" ? "SUPPLIER" : "CONSULTANCY", status: "PENDING" } });
    await tx.organizationMember.create({ data: { userId, organizationId: org.id, role: "OWNER" } });
    // Stays a draft, out of sight, until it is paid for
    const item = await tx.contentItem.create({
      data: { contentType: info.contentType, title: d.name, slug, shortSummary: d.what.slice(0, 280), publicationStatus: "DRAFT", createdById: userId },
    });
    if (kind.data === "supplier") {
      await tx.supplier.create({ data: { contentItemId: item.id, organizationId: org.id, country: d.country, items: list(d.what), phone, listingClaimed: true } });
    } else {
      await tx.consultant.create({
        data: { contentItemId: item.id, organizationId: org.id, ownerId: userId, fullName: d.name, businessName: d.business || null, professionalTitle: d.title || null, specialties: list(d.what), country: d.country, district: d.place || null, phone },
      });
    }
    await tx.subscription.create({ data: { userId, organizationId: org.id, planId: plan.id, status: "PAST_DUE", period: "MONTHLY" } });
    if (pinHash) await tx.user.update({ where: { id: userId }, data: { passwordHash: pinHash, pinMustChange: false } });
  });
  await ensureUsername(userId, d.name);
  await audit(userId, "partner.registered", "user", userId, { kind: kind.data });
  revalidatePath("/admin/partners");
  redirect(info.join);
}

const simulate = () => process.env.PAYMENT_SIMULATE === "true";
const payInput = z.object({ kind: kindOf, period: z.enum(PLAN_PERIODS) });

/** Starts or renews a listing. It counts only when Pesapal confirms (settlePayment), or at once in simulation. */
export async function startPartnerPayment(input: { kind: PartnerKind; period: BillingPeriod }): Promise<CheckoutOutcome> {
  const session = await getSession();
  if (!session?.user?.id) return { status: "error", message: "Please sign in first." };
  const parsed = payInput.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Choose a plan." };
  const { kind, period } = parsed.data;
  const userId = session.user.id;

  const plan = await partnerPlan(kind);
  const price = plan[PRICE_FIELD[period]];
  if ((price === null || Number(price) <= 0) && !simulate()) return { status: "error", message: "This plan's price hasn't been set yet. Please check back soon." };
  if (!(await allow(`checkout:user:${userId}`, ...LIMITS.checkoutPerUser))) return { status: "error", message: "Too many payment attempts. Please wait a few minutes and try again." };

  const sub = await prisma.subscription.findFirst({ where: { userId, planId: plan.id }, orderBy: { startedAt: "desc" } });
  if (!sub) return { status: "error", message: "Please register first." };
  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });

  // An earlier order left open: cancel it so it can't be paid later. A paid one is kept and counts.
  const open = await prisma.payment.findMany({ where: { subscriptionId: sub.id, status: { in: ["PENDING", "FAILED"] }, providerRef: { not: null } } });
  for (const p of open) await cancelPayment(p.id);

  const payment = await prisma.payment.create({ data: { subscriptionId: sub.id, amount: price ?? 0, currency: plan.currency, method: "PESAPAL", period } });

  if (simulate()) {
    const from = sub.status === "ACTIVE" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", paidAt: new Date(), providerRef: `simulated-${payment.id}`, method: "MANUAL" } }),
      prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", period, currentPeriodEnd: periodEnd(from, period), remindersSent: [] } }),
    ]);
    if (sub.organizationId) await partnerPaid(sub.organizationId);
    await audit(userId, "payment.simulated", "payment", payment.id, { period });
    return { status: "active" };
  }

  if (!pesapalConfigured()) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { status: "error", message: "Online payments aren't connected yet. Please contact us." };
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true, name: true } });
  try {
    const res = await startCheckout({
      paymentId: payment.id,
      amount: Number(price),
      currency: "UGX",
      description: `BizSphere-Ug ${plan.name} ${PERIOD_WORD[period].replace(" membership", "")}`,
      phone: phoneKey(user?.phone ?? "") ?? undefined,
      email: user?.email ?? undefined,
      name: user?.name ?? undefined,
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: res.providerRef } });
    await audit(userId, "payment.started", "payment", payment.id, { period, kind });
    return { status: "checkout", url: res.url, paymentId: payment.id };
  } catch (e) {
    console.error(`pesapal checkout: ${(e as Error).message}`);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { status: "error", message: "We couldn't open the payment page just now. Please try again." };
  }
}

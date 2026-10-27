"use server";

import { z } from "zod";
import type { BillingPeriod, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { getViewer } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { phoneKey, sendCode, type SendResult } from "@/lib/phone-codes";
import { startCheckout } from "@/lib/payments";

/**
 * Server side of phone sign-in and the onboarding pop-up (src/components/Onboarding.tsx):
 *   1. requestCode       text a one-time code (the account is created when it's confirmed)
 *   2. accessState       after sign-in: does this person already have full access?
 *   3. startMembership   create the subscription + payment and start the charge
 */
export async function requestCode(phone: string): Promise<SendResult> {
  return sendCode(phone);
}

/** `phone` pre-fills the mobile money number at the payment step. */
export async function accessState() {
  const viewer = await getViewer();
  const user = viewer.userId ? await prisma.user.findUnique({ where: { id: viewer.userId }, select: { phone: true } }) : null;
  return { signedIn: Boolean(viewer.userId), isMember: viewer.isMember, phone: user?.phone ?? null };
}

/** Simulated payments for demos. Never set PAYMENT_SIMULATE on the live server. */
const simulate = () => process.env.PAYMENT_SIMULATE === "true";

const checkoutInput = z.object({
  period: z.enum(["MONTHLY", "YEARLY"]),
  method: z.enum(["MTN_MOMO", "AIRTEL_MONEY", "CARD"]),
  phone: z.string().trim().optional(),
});

export type CheckoutOutcome =
  | { status: "active" }
  | { status: "prompt_sent" }
  | { status: "redirect"; url: string }
  | { status: "error"; message: string };

/**
 * Starts a membership. Access is granted only when the payment succeeds: by the
 * gateway's webhook (/api/payments/webhook), or immediately in simulation mode.
 */
export async function startMembership(input: { period: BillingPeriod; method: PaymentMethod; phone?: string }): Promise<CheckoutOutcome> {
  const session = await getSession();
  if (!session?.user?.id) return { status: "error", message: "Please sign in first." };
  const parsed = checkoutInput.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Choose a payment method." };
  const { period, method } = parsed.data;

  const mobile = method !== "CARD";
  const phone = mobile ? phoneKey(parsed.data.phone ?? "") : null;
  if (mobile && !phone) return { status: "error", message: "Enter the mobile money number to charge." };

  const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" } });
  if (!plan) return { status: "error", message: "Membership is not available yet." };
  const price = period === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
  if (price === null && !simulate()) {
    return { status: "error", message: "Membership prices haven't been set yet. Please check back soon." };
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  // One subscription waiting for payment per person: reuse it rather than piling up.
  // PAST_DUE grants no access (see getViewer); only a successful payment activates it.
  const sub =
    (await prisma.subscription.findFirst({ where: { userId, planId: plan.id, status: "PAST_DUE" } })) ??
    (await prisma.subscription.create({ data: { userId, planId: plan.id, status: "PAST_DUE", period } }));
  if (sub.period !== period) await prisma.subscription.update({ where: { id: sub.id }, data: { period } });

  const payment = await prisma.payment.create({
    data: { subscriptionId: sub.id, amount: price ?? 0, currency: plan.currency, method },
  });

  if (simulate()) {
    const end = new Date();
    if (period === "YEARLY") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", paidAt: new Date(), providerRef: `simulated-${payment.id}` } }),
      prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", period, currentPeriodEnd: end } }),
    ]);
    await audit(userId, "payment.simulated", "payment", payment.id, { period, method });
    return { status: "active" };
  }

  try {
    const res = await startCheckout({ subscriptionId: sub.id, amount: Number(price), currency: "UGX", method, phone: phone ?? undefined, email: user?.email ?? undefined });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: res.providerRef } });
    await audit(userId, "payment.started", "payment", payment.id, { period, method });
    return res.kind === "redirect" ? { status: "redirect", url: res.url } : { status: "prompt_sent" };
  } catch {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { status: "error", message: "Online payments aren't connected yet. Please contact us to activate your membership." };
  }
}

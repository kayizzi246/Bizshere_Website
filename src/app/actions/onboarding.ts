"use server";

import { z } from "zod";
import type { BillingPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { periodEnd } from "@/lib/billing";
import { audit } from "@/lib/audit";
import { getViewer } from "@/lib/access";
import { getSession } from "@/lib/auth";
import { phoneKey, sendCode, type SendResult } from "@/lib/phone-codes";
import { cancelOrder, pesapalConfigured, startCheckout } from "@/lib/payments";
import { PERIOD_WORD, settlePayment, type Settled } from "@/lib/membership";

/**
 * Server side of phone sign-in and the onboarding pop-up (src/components/Onboarding.tsx):
 *   1. requestCode       text a one-time code (the account is created when it's confirmed)
 *   2. accessState       after sign-in: does this person already have full access?
 *   3. startMembership   create the payment and the Pesapal order shown in the pop-up
 *   4. checkPayment      the pop-up asks every few seconds whether it went through
 *   5. cancelPayment     plan changed or pop-up closed before paying: cancel the Pesapal order
 */
export async function requestCode(phone: string): Promise<SendResult> {
  return sendCode(phone);
}

/** `phone` fills in Pesapal's form; `memberUntil` is shown on the welcome screen. */
export async function accessState() {
  const viewer = await getViewer();
  if (!viewer.userId) return { signedIn: false, isMember: false, phone: null, memberUntil: null };
  const [user, sub] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewer.userId }, select: { phone: true } }),
    prisma.subscription.findFirst({ where: { userId: viewer.userId, status: "ACTIVE", plan: { code: "member" } }, orderBy: { currentPeriodEnd: { sort: "desc", nulls: "first" } }, select: { currentPeriodEnd: true } }),
  ]);
  return { signedIn: true, isMember: viewer.isMember, phone: user?.phone ?? null, memberUntil: sub?.currentPeriodEnd?.toISOString() ?? null };
}

/** Simulated payments for demos. Never set PAYMENT_SIMULATE on the live server. */
const simulate = () => process.env.PAYMENT_SIMULATE === "true";

const checkoutInput = z.object({ period: z.enum(["DAILY", "MONTHLY", "YEARLY"]) });

export type CheckoutOutcome =
  | { status: "active" }
  | { status: "checkout"; url: string; paymentId: string }
  | { status: "error"; message: string };

/**
 * Starts (or renews) a membership. Access is granted only when Pesapal confirms the payment
 * (settlePayment in src/lib/membership.ts), or immediately in simulation mode.
 */
export async function startMembership(input: { period: BillingPeriod }): Promise<CheckoutOutcome> {
  const session = await getSession();
  if (!session?.user?.id) return { status: "error", message: "Please sign in first." };
  const parsed = checkoutInput.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Choose a plan." };
  const { period } = parsed.data;

  const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" } });
  if (!plan) return { status: "error", message: "Membership is not available yet." };
  const price = period === "YEARLY" ? plan.priceYearly : period === "DAILY" ? plan.priceDaily : plan.priceMonthly;
  if ((price === null || Number(price) <= 0) && !simulate()) {
    return { status: "error", message: "Membership prices haven't been set yet. Please check back soon." };
  }

  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, phone: true, name: true } });
  // One membership per person: renewals and retries reuse it. A new one waits as PAST_DUE
  // (no access, see getViewer) until a payment succeeds.
  const existing = await prisma.subscription.findFirst({ where: { userId, planId: plan.id }, orderBy: { startedAt: "desc" } });
  if (existing?.status === "ACTIVE" && existing.currentPeriodEnd === null) return { status: "error", message: "You already have full access." };
  const sub = existing ?? (await prisma.subscription.create({ data: { userId, planId: plan.id, status: "PAST_DUE", period } }));
  if (sub.status !== "ACTIVE" && sub.status !== "PAST_DUE") await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });

  // An earlier order left open (plan changed, pop-up closed): cancel it so it can't be paid later.
  const open = await prisma.payment.findMany({ where: { subscriptionId: sub.id, status: "PENDING" } });
  for (const p of open) await dropPayment(p.id, p.providerRef);

  const payment = await prisma.payment.create({
    data: { subscriptionId: sub.id, amount: price ?? 0, currency: plan.currency, method: "PESAPAL", period },
  });

  if (simulate()) {
    const from = sub.status === "ACTIVE" && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", paidAt: new Date(), providerRef: `simulated-${payment.id}`, method: "MANUAL" } }),
      prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", period, currentPeriodEnd: periodEnd(from, period), remindersSent: [] } }),
    ]);
    await audit(userId, "payment.simulated", "payment", payment.id, { period });
    return { status: "active" };
  }

  if (!pesapalConfigured()) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { status: "error", message: "Online payments aren't connected yet. Please contact us to activate your membership." };
  }
  try {
    const res = await startCheckout({
      paymentId: payment.id,
      amount: Number(price),
      currency: "UGX",
      description: `BizSphere-Ug ${plan.name} ${PERIOD_WORD[period]}`,
      phone: phoneKey(user?.phone ?? "") ?? undefined,
      email: user?.email ?? undefined,
      name: user?.name ?? undefined,
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { providerRef: res.providerRef } });
    await audit(userId, "payment.started", "payment", payment.id, { period });
    return { status: "checkout", url: res.url, paymentId: payment.id };
  } catch (e) {
    console.error(`pesapal checkout: ${(e as Error).message}`);
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return { status: "error", message: "We couldn't open the payment page just now. Please try again, or contact us to activate your membership." };
  }
}

/** The signed-in person's own payment, or null. */
async function ownPayment(paymentId: string) {
  const session = await getSession();
  if (!session?.user?.id || typeof paymentId !== "string") return null;
  return prisma.payment.findFirst({ where: { id: paymentId, subscription: { userId: session.user.id } } });
}

/** Called by the pop-up every few seconds while the Pesapal page is open, and when it returns. */
export async function checkPayment(paymentId: string): Promise<Settled> {
  const payment = await ownPayment(paymentId);
  if (!payment) return "FAILED";
  return settlePayment({ paymentId: payment.id }).catch(() => "PENDING" as const);
}

/**
 * Plan changed or pop-up closed before paying. If it was paid in the meantime it is kept (and
 * applied); otherwise the Pesapal order is cancelled so it can no longer be paid.
 */
export async function cancelPayment(paymentId: string): Promise<Settled> {
  const payment = await ownPayment(paymentId);
  if (!payment) return "FAILED";
  return dropPayment(payment.id, payment.providerRef);
}

async function dropPayment(id: string, trackingId: string | null): Promise<Settled> {
  const now = trackingId ? await settlePayment({ paymentId: id }).catch(() => "PENDING" as const) : "PENDING";
  if (now !== "PENDING") return now;
  if (trackingId) await cancelOrder(trackingId);
  await prisma.payment.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED" } });
  return "CANCELLED";
}

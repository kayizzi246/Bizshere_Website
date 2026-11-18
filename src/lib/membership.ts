/**
 * Membership payments after checkout: settling a Pesapal order, and telling the member.
 *
 * settlePayment() is the ONLY place a Pesapal payment grants access. The IPN
 * (/api/payments/webhook), the iframe return page (/payments/return) and the pop-up's polling
 * (checkPayment in src/app/actions/onboarding.ts) all call it, and it always asks Pesapal for the
 * order's real status first. Safe to call any number of times: a payment is applied once.
 */
import type { BillingPeriod, PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma, transaction } from "./prisma";
import { periodEnd } from "./billing";
import { orderStatus } from "./payments";
import { audit } from "./audit";
import { sendSms } from "./sms";
import { sendEmail } from "./email";
import { site } from "@/config/site";
import { date, money } from "./format";
import { forgetMemo } from "./memo";
import { redeem } from "./promos";

export type Settled = "SUCCEEDED" | "PENDING" | "FAILED" | "CANCELLED" | "REFUNDED";

/** Supplier and expert listings (src/lib/partners.ts): their own plans, which never open member content. */
export const PARTNER_CODES = { supplier: "supplier_listing", expert: "expert_listing" } as const;
export type PartnerKind = keyof typeof PARTNER_CODES;
const isListing = (code?: string) => code === PARTNER_CODES.supplier || code === PARTNER_CODES.expert;

export const PERIOD_WORD: Record<BillingPeriod, string> = {
  DAILY: "day pass", WEEKLY: "weekly membership", MONTHLY: "monthly membership", HALF_YEARLY: "6-month membership",
  YEARLY: "yearly membership", TWO_YEARS: "2-year membership", THREE_YEARS: "3-year membership",
};

/** Pesapal's payment_method text → our method. */
function methodOf(m: string | null): PaymentMethod | null {
  if (!m) return null;
  if (/mtn|momo/i.test(m)) return "MTN_MOMO";
  if (/airtel/i.test(m)) return "AIRTEL_MONEY";
  if (/visa|master|card|amex/i.test(m)) return "CARD";
  return null;
}

const RETRYABLE: PaymentStatus[] = ["PENDING", "FAILED"];

export async function settlePayment(where: { paymentId: string } | { trackingId: string }): Promise<Settled> {
  const payment = await prisma.payment.findFirst({
    where: "paymentId" in where ? { id: where.paymentId } : { providerRef: where.trackingId },
    include: { subscription: { include: { plan: { select: { code: true } } } } },
  });
  if (!payment) return "FAILED";
  // A failed attempt is not the end: on Pesapal's page the person can try again on the same order
  // (e.g. the MoMo prompt timed out), so FAILED orders are checked again too. Paid, cancelled and
  // refunded ones are final.
  if (!RETRYABLE.includes(payment.status) || !payment.providerRef) return payment.status;

  const s = await orderStatus(payment.providerRef);
  if (s.status === "PENDING") return "PENDING";
  if (s.status !== "SUCCEEDED") {
    // Keep Pesapal's reason (it changes when a retry on the same order fails differently)
    if (payment.status !== s.status || (s.reason && payment.failureReason !== s.reason)) {
      await prisma.payment.updateMany({ where: { id: payment.id, status: { in: RETRYABLE } }, data: { status: s.status, failureReason: s.reason } });
      if (payment.status !== s.status) await audit(payment.subscription.userId, `payment.${s.status.toLowerCase()}`, "payment", payment.id, { method: s.method, reason: s.reason });
      console.warn(`payment ${payment.id} ${s.status.toLowerCase()} (${s.method ?? "unknown method"}): ${s.reason ?? "no reason given"}`);
    }
    return s.status;
  }
  // The order must be ours and for the full amount before it opens anything.
  if (s.merchantReference !== payment.id || (s.amount === null || !Number.isFinite(s.amount) || s.amount < Number(payment.amount)) || s.currency !== payment.currency) {
    await audit(null, "payment.mismatch", "payment", payment.id, { amount: s.amount, currency: s.currency, reference: s.merchantReference });
    return "PENDING";
  }

  const sub = payment.subscription;
  const period = payment.period ?? sub.period;
  // Paying early (renewing) adds to the time left rather than starting over.
  const from = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() && sub.status === "ACTIVE" ? sub.currentPeriodEnd : new Date();
  const end = periodEnd(from, period);
  const applied = await transaction(async (tx) => {
    // Only one caller wins the change to SUCCEEDED, so the period is never added twice.
    const won = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: RETRYABLE } },
      data: { status: "SUCCEEDED", paidAt: s.paidAt ?? new Date(), method: methodOf(s.method) ?? payment.method },
    });
    if (!won.count) return false;
    await tx.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", period, currentPeriodEnd: end, cancelledAt: null, remindersSent: [] } });
    return true;
  });
  if (!applied) return "SUCCEEDED";

  // The membership check shared for a few seconds (src/lib/memo.ts) must not hide the new access
  if (sub.userId) forgetMemo(`member:${sub.userId}`);
  await audit(sub.userId, "payment.succeeded", "payment", payment.id, { method: s.method, code: s.confirmationCode });
  const listing = isListing(sub.plan?.code);
  if (listing && sub.organizationId) await partnerPaid(sub.organizationId);
  if (listing && sub.userId) {
    await notifyMember(sub.userId, {
      title: "Payment received for your listing",
      text: `Thank you! We received ${money(payment.amount, payment.currency)} for your BizSphere-Ug listing, paid until ${date(end)}.`,
      link: sub.plan.code === PARTNER_CODES.expert ? "/expert" : "/supplier",
    }).catch(() => {});
  } else if (sub.userId) {
    await notifyMember(sub.userId, {
      title: "Payment received: you have full access",
      text: `Thank you! We received ${money(payment.amount, payment.currency)} for your BizSphere-Ug ${PERIOD_WORD[period]}. Full access until ${date(end)}.`,
      link: "/account#membership",
    }).catch(() => {});
    // The discount code is used up now, not when the pop-up opened, and whoever invited them gets
    // their free days. Neither may undo a payment that has already gone through, so both are caught.
    await redeem(payment, sub.userId).catch((e: Error) => console.error(`promo: ${payment.id}: ${e.message}`));
    // Loaded here rather than at the top: src/lib/referrals.ts needs grantDays from this file, and
    // two files that import each other at load time can leave one of them half-built.
    await import("./referrals")
      .then((m) => m.rewardInvite(sub.userId!))
      .catch((e: Error) => console.error(`invite reward: ${sub.userId}: ${e.message}`));
  }
  return "SUCCEEDED";
}

/**
 * Gives someone full access for `days` without a payment: the free 24-hour pass
 * (src/lib/free-pass.ts) and the free days both sides get for an invite (src/lib/referrals.ts).
 *
 * The days are added to the end of what they already have, so a member who is given days keeps
 * every day they paid for. Someone with access that has no end date (staff accounts, access given
 * by hand) is left alone and null comes back. `status` is TRIAL for the free pass, so the admin
 * and the renewal reminders can tell a trial from a paid membership.
 */
export async function grantDays(userId: string, days: number, opts: { status?: "ACTIVE" | "TRIAL"; reason: string }): Promise<Date | null> {
  if (!Number.isFinite(days) || days <= 0) return null;
  const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" }, select: { id: true } });
  if (!plan) return null;
  const now = new Date();
  const sub = await prisma.subscription.findFirst({ where: { userId, planId: plan.id }, orderBy: { startedAt: "desc" } });
  // Access with no end date: nothing to add to, and we must not replace it with an end date.
  if (sub && sub.currentPeriodEnd === null && (sub.status === "ACTIVE" || sub.status === "TRIAL")) return null;
  const live = sub?.currentPeriodEnd && sub.currentPeriodEnd > now && (sub.status === "ACTIVE" || sub.status === "TRIAL");
  const from = live ? sub!.currentPeriodEnd! : now;
  const end = new Date(from.getTime() + days * 86_400_000);
  // A trial on top of a paid membership stays ACTIVE: it is still a paid membership, just longer.
  const status = live && sub!.status === "ACTIVE" ? "ACTIVE" : opts.status ?? "ACTIVE";
  if (sub) await prisma.subscription.update({ where: { id: sub.id }, data: { status, currentPeriodEnd: end, cancelledAt: null, remindersSent: [] } });
  else await prisma.subscription.create({ data: { userId, planId: plan.id, status, period: "DAILY", currentPeriodEnd: end } });
  forgetMemo(`member:${userId}`);
  await audit(userId, "membership.granted", "subscription", sub?.id, { days, reason: opts.reason, until: end.toISOString() });
  return end;
}

/**
 * A listing has been paid for. A new one goes to the team to check (/admin/partners); one hidden
 * because it lapsed comes straight back, as the team has already approved it.
 */
export async function partnerPaid(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { status: true, supplier: { select: { contentItemId: true } }, consultants: { select: { contentItemId: true }, take: 1 } },
  });
  const id = org?.supplier?.contentItemId ?? org?.consultants[0]?.contentItemId;
  if (!org || !id) return;
  if (org.status === "SUSPENDED") {
    await prisma.$transaction([
      prisma.organization.update({ where: { id: organizationId }, data: { status: "ACTIVE" } }),
      prisma.contentItem.update({ where: { id }, data: { publicationStatus: "PUBLISHED" } }),
    ]);
  } else {
    await prisma.contentItem.updateMany({ where: { id, publicationStatus: "DRAFT" }, data: { publicationStatus: "IN_REVIEW" } });
  }
}

/** A link for a text message. The word "account" gets shortened to "a/c" on the way to the phone, which breaks the link, so texts use /me (next.config.mjs). */
export const smsLink = (link: string) => link.replace(/^\/account(?=$|[/?#])/, "/me");

/**
 * Tells a member something about their membership: an alert in /account, plus an SMS to the
 * phone and an email to the address they signed up with (whichever they have).
 */
export async function notifyMember(userId: string, msg: { title: string; text: string; link: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true, name: true } });
  if (!user) return;
  const url = `${site.url}${msg.link}`;
  const textUrl = `${site.url}${smsLink(msg.link)}`;
  const sent = await Promise.all([
    user.phone ? sendSms(user.phone, `${msg.text} ${textUrl}`) : false,
    user.email ? sendEmail(user.email, msg.title, `Hello ${user.name || "there"},\n\n${msg.text}\n\n${url}\n\nBizSphere-Ug`) : false,
  ]);
  await prisma.alert.create({
    data: { userId, kind: "SYSTEM", title: msg.title, body: msg.text, link: msg.link, emailedAt: sent[1] ? new Date() : null },
  });
}

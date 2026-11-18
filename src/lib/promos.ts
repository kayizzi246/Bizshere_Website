/**
 * Discount codes for membership payments (Admin > Promo codes).
 *
 * A code only ever changes the price of one payment. It never changes what a membership opens and
 * never shortens or lengthens it. The rules, all checked on the server:
 *   - the code is active, and today is inside its start/end dates;
 *   - it works on the length being bought (`periods`, empty meaning all of them);
 *   - it has uses left (`maxRedemptions` across everyone), and this person has not used it before;
 *   - what is left to pay is at least MIN_CHARGE, so Pesapal always has a real amount to collect.
 *
 * A code is only used up when the payment succeeds (redeem(), called from settlePayment), so an
 * abandoned pop-up leaves a limited code free for someone else.
 */
import type { BillingPeriod, PromoCode } from "@prisma/client";
import { prisma } from "./prisma";
import { money } from "./format";

/** The smallest amount we will send to Pesapal: a code can never bring a payment below this. */
export const MIN_CHARGE = 500;

export type PromoOffer = {
  id: string;
  code: string;
  /** Money off, in the plan's currency. */
  off: number;
  /** What is left to pay. */
  total: number;
  /** "20% off" / "UGX 5,000 off" */
  label: string;
};

export type PromoCheck = { ok: true; offer: PromoOffer } | { ok: false; message: string };

/** Codes are stored and compared upper case, with spaces taken out ("launch 20" → "LAUNCH20"). */
export const normalizeCode = (code: string) => code.replace(/\s+/g, "").toUpperCase().slice(0, 32);

/** What this code takes off `amount`, never leaving less than MIN_CHARGE to pay. */
export function discountOf(promo: Pick<PromoCode, "kind" | "value">, amount: number) {
  const raw = promo.kind === "PERCENT" ? Math.round((amount * Number(promo.value)) / 100) : Math.round(Number(promo.value));
  return Math.max(0, Math.min(raw, amount - MIN_CHARGE));
}

const describe = (promo: Pick<PromoCode, "kind" | "value">, currency: string) =>
  promo.kind === "PERCENT" ? `${Number(promo.value)}% off` : `${money(Number(promo.value), currency)} off`;

/**
 * Checks a code for this person, this length and this price. The message is shown to the member,
 * so it says what is wrong without giving away whether a code exists for someone else.
 */
export async function checkPromo(input: { code: string; userId: string; period: BillingPeriod; amount: number; currency: string }): Promise<PromoCheck> {
  const code = normalizeCode(input.code);
  if (!code) return { ok: false, message: "Type your code." };
  const promo = await prisma.promoCode.findUnique({ where: { code }, include: { _count: { select: { redemptions: true } } } });
  const now = new Date();
  if (!promo || !promo.isActive) return { ok: false, message: "That code isn't valid." };
  if (promo.startsAt && promo.startsAt > now) return { ok: false, message: "That code isn't valid yet." };
  if (promo.expiresAt && promo.expiresAt <= now) return { ok: false, message: "That code has expired." };
  if (promo.periods.length && !promo.periods.includes(input.period)) {
    return { ok: false, message: "That code doesn't work on this plan. Pick another length, or pay without it." };
  }
  if (promo.maxRedemptions !== null && promo._count.redemptions >= promo.maxRedemptions) {
    return { ok: false, message: "That code has been used up." };
  }
  const used = await prisma.promoRedemption.findFirst({ where: { promoCodeId: promo.id, userId: input.userId }, select: { id: true } });
  if (used) return { ok: false, message: "You have already used that code." };
  const off = discountOf(promo, input.amount);
  if (off <= 0) return { ok: false, message: "That code can't be used on this price." };
  return {
    ok: true,
    offer: { id: promo.id, code: promo.code, off, total: input.amount - off, label: describe(promo, input.currency) },
  };
}

/**
 * The offer to show on the homepage: the newest code the team ticked "show on the site" that is
 * live today and has uses left. Nothing is shown when there is none, so the band simply isn't there.
 *
 * It is cached for a minute: every visitor's homepage asks for it, and an offer that appears a
 * minute late costs nothing.
 */
export type PublicOffer = { code: string; headline: string; label: string };

export async function publicOffer(): Promise<PublicOffer | null> {
  const now = new Date();
  const codes = await prisma.promoCode
    .findMany({
      where: {
        showOnSite: true, isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }],
      },
      include: { _count: { select: { redemptions: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    })
    .catch(() => []);
  const live = codes.find((c) => c.maxRedemptions === null || c._count.redemptions < c.maxRedemptions);
  if (!live) return null;
  const plan = await prisma.membershipPlan.findUnique({ where: { code: "member" }, select: { currency: true } }).catch(() => null);
  const label = describe(live, plan?.currency ?? "UGX");
  return { code: live.code, headline: live.headline?.trim() || `${label} your first membership`, label };
}

/**
 * Records the use of a code, now that the payment has gone through. Called once per payment from
 * settlePayment; a second call changes nothing (the payment id is unique).
 */
export async function redeem(payment: { id: string; promoCodeId: string | null; discount: unknown }, userId: string | null) {
  if (!payment.promoCodeId || !userId) return;
  const amountOff = Number(payment.discount ?? 0);
  if (!Number.isFinite(amountOff) || amountOff <= 0) return;
  await prisma.promoRedemption
    .create({ data: { promoCodeId: payment.promoCodeId, userId, paymentId: payment.id, amountOff } })
    .catch(() => {}); // already recorded, or the code has since been deleted
}

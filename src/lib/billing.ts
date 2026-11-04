import type { BillingPeriod } from "@prisma/client";
import { money } from "./format";

/** When a paid period ends: a day pass lasts 24 hours, otherwise a month or a year. */
export function periodEnd(from: Date, period: BillingPeriod) {
  const end = new Date(from);
  if (period === "DAILY") end.setDate(end.getDate() + 1);
  else if (period === "YEARLY") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

/** Yearly against 12 monthly payments, as a whole percentage (or null when it isn't cheaper). */
export function yearlySaving(amounts: Record<BillingPeriod, number | null>) {
  const m = amounts.MONTHLY;
  const y = amounts.YEARLY;
  if (!m || !y || y >= m * 12) return null;
  return Math.round((1 - y / (m * 12)) * 100);
}

type PlanPrices = { name: string; currency: string; priceDaily: unknown; priceMonthly: unknown; priceYearly: unknown };

/**
 * The member plan as the payment pop-up needs it (src/components/Onboarding.tsx): prices as text
 * and as numbers. Cached plans arrive with prices as strings (src/lib/cached.ts); a price of 0
 * or none can't be paid for, so it counts as not set.
 */
export function popupPlan(p: PlanPrices | null | undefined) {
  const amount = (v: unknown) => (v != null && Number(v) > 0 ? Number(v) : null);
  const currency = p?.currency ?? "UGX";
  const text = (v: unknown) => (v != null ? money(v as number, currency) : null);
  return {
    name: p?.name ?? "Member",
    currency,
    daily: text(p?.priceDaily),
    monthly: text(p?.priceMonthly),
    yearly: text(p?.priceYearly),
    amounts: { DAILY: amount(p?.priceDaily), MONTHLY: amount(p?.priceMonthly), YEARLY: amount(p?.priceYearly) } as Record<BillingPeriod, number | null>,
  };
}

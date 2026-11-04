import type { BillingPeriod } from "@prisma/client";
import { money } from "./format";

/** The member plan's lengths, shortest first: the order of the plans in the admin, on /membership and in the pop-up. */
export const PLAN_PERIODS = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const satisfies readonly BillingPeriod[];

/** Where each length's price is kept on MembershipPlan. */
export const PRICE_FIELD = { DAILY: "priceDaily", WEEKLY: "priceWeekly", MONTHLY: "priceMonthly", YEARLY: "priceYearly" } as const satisfies Record<BillingPeriod, string>;

/** Names for each length: the plan ("Weekly"), the unit ("week") and the length in days (for progress bars). */
export const PERIOD_INFO: Record<BillingPeriod, { label: string; per: string; days: number }> = {
  DAILY: { label: "Daily", per: "day", days: 1 },
  WEEKLY: { label: "Weekly", per: "week", days: 7 },
  MONTHLY: { label: "Monthly", per: "month", days: 30 },
  YEARLY: { label: "Yearly", per: "year", days: 365 },
};

/** When a paid period ends: a day pass lasts 24 hours, a week 7 days, otherwise a month or a year. */
export function periodEnd(from: Date, period: BillingPeriod) {
  const end = new Date(from);
  if (period === "DAILY") end.setDate(end.getDate() + 1);
  else if (period === "WEEKLY") end.setDate(end.getDate() + 7);
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

type PlanPrices = { name: string; currency: string } & Record<(typeof PRICE_FIELD)[BillingPeriod], unknown>;

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
    weekly: text(p?.priceWeekly),
    monthly: text(p?.priceMonthly),
    yearly: text(p?.priceYearly),
    amounts: Object.fromEntries(PLAN_PERIODS.map((k) => [k, amount(p?.[PRICE_FIELD[k]])])) as Record<BillingPeriod, number | null>,
  };
}

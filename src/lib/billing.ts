import type { BillingPeriod } from "@prisma/client";

/** When a paid period ends: a day pass lasts 24 hours, otherwise a month or a year. */
export function periodEnd(from: Date, period: BillingPeriod) {
  const end = new Date(from);
  if (period === "DAILY") end.setDate(end.getDate() + 1);
  else if (period === "YEARLY") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
}

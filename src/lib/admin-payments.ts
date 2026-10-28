import type { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/** Payments received through the site, with the customer and plan, for the admin Payments page and its CSV export. */

export const PAYMENT_STATUSES: PaymentStatus[] = ["SUCCEEDED", "PENDING", "FAILED", "REFUNDED"];
export const PAYMENT_METHODS: PaymentMethod[] = ["MTN_MOMO", "AIRTEL_MONEY", "CARD", "BANK_TRANSFER", "MANUAL"];
export const METHOD_LABEL: Record<PaymentMethod, string> = { MTN_MOMO: "MTN MoMo", AIRTEL_MONEY: "Airtel Money", CARD: "Card", BANK_TRANSFER: "Bank transfer", MANUAL: "Manual" };
export const STATUS_LABEL: Record<PaymentStatus, string> = { SUCCEEDED: "Paid", PENDING: "Pending", FAILED: "Failed", REFUNDED: "Refunded" };

export type PaymentFilters = { status?: string; method?: string; q?: string };

export function paymentWhere(f: PaymentFilters): Prisma.PaymentWhereInput {
  const q = f.q?.trim();
  return {
    ...(PAYMENT_STATUSES.includes(f.status as PaymentStatus) ? { status: f.status as PaymentStatus } : {}),
    ...(PAYMENT_METHODS.includes(f.method as PaymentMethod) ? { method: f.method as PaymentMethod } : {}),
    ...(q ? {
      OR: [
        { providerRef: { contains: q, mode: "insensitive" } },
        { subscription: { user: { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } } },
        { subscription: { organization: { legalName: { contains: q, mode: "insensitive" } } } },
      ],
    } : {}),
  };
}

export function listPayments(f: PaymentFilters, take = 200) {
  return prisma.payment.findMany({
    where: paymentWhere(f),
    include: { subscription: { include: { plan: { select: { name: true } }, user: { select: { name: true, email: true, phone: true } }, organization: { select: { legalName: true } } } } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export type PaymentRow = Awaited<ReturnType<typeof listPayments>>[number];
export const customerOf = (p: PaymentRow) => ({
  name: p.subscription.user?.name ?? p.subscription.organization?.legalName ?? "Unknown customer",
  contact: p.subscription.user?.email ?? p.subscription.user?.phone ?? "",
});

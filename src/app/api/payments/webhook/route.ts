import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhook } from "@/lib/payments";
import { audit } from "@/lib/audit";

/**
 * Payment gateway callback. Access is granted ONLY here, never from the browser
 * redirect after checkout (see src/lib/payments.ts).
 *
 * Expected body once a gateway is chosen (adapt the parsing to the gateway):
 *   { providerRef: string, status: "SUCCEEDED" | "FAILED", paidAt?: string }
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let ok = false;
  try {
    ok = await verifyWebhook(raw, req.headers.get("x-signature"));
  } catch {
    return NextResponse.json({ error: "Payment provider not configured" }, { status: 501 });
  }
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const event = JSON.parse(raw) as { providerRef?: string; status?: string; paidAt?: string };
  if (!event.providerRef) return NextResponse.json({ error: "Missing providerRef" }, { status: 400 });
  const payment = await prisma.payment.findFirst({ where: { providerRef: event.providerRef }, include: { subscription: true } });
  if (!payment) return NextResponse.json({ error: "Unknown payment" }, { status: 404 });
  if (payment.status === "SUCCEEDED") return NextResponse.json({ ok: true, duplicate: true });

  if (event.status === "SUCCEEDED") {
    const sub = payment.subscription;
    const from = sub.currentPeriodEnd && sub.currentPeriodEnd > new Date() ? sub.currentPeriodEnd : new Date();
    const end = new Date(from);
    if (sub.period === "YEARLY") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", paidAt: event.paidAt ? new Date(event.paidAt) : new Date() } }),
      prisma.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", currentPeriodEnd: end } }),
    ]);
  } else {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  }
  await audit(null, `payment.${String(event.status).toLowerCase()}`, "payment", payment.id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { settlePayment } from "@/lib/membership";

export const dynamic = "force-dynamic";

/**
 * Pesapal IPN: called when an order's status changes, as a POST with a JSON body (or a GET with
 * the same fields as query parameters). The call itself is not trusted: settlePayment asks
 * Pesapal for the order's status before anything changes (see src/lib/payments.ts).
 *
 * Pesapal expects this reply, with status 200 once handled (500 makes it try again later).
 */
const notificationSchema = z.object({
  OrderTrackingId: z.string().trim().min(1).max(200),
  OrderMerchantReference: z.string().max(200).optional(),
  OrderNotificationType: z.string().max(100).optional(),
});

async function handle(fields: unknown) {
  const parsed = notificationSchema.safeParse(fields);
  if (!parsed.success) return NextResponse.json({ status: 500 }, { status: 400 });
  const { OrderTrackingId: trackingId, OrderMerchantReference: reference = "", OrderNotificationType: type = "IPNCHANGE" } = parsed.data;
  const reply = (status: 200 | 500) =>
    NextResponse.json({ orderNotificationType: type, orderTrackingId: trackingId, orderMerchantReference: reference, status }, { status });
  if (!trackingId) return reply(500);
  try {
    await settlePayment({ trackingId });
    return reply(200);
  } catch (e) {
    console.error(`pesapal ipn: ${(e as Error).message}`);
    return reply(500);
  }
}

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  return handle(body);
}

export async function GET(req: Request) {
  return handle(Object.fromEntries(new URL(req.url).searchParams));
}

/**
 * Payments: MTN Mobile Money, Airtel Money and cards.
 *
 * Not connected yet. Choose a gateway that supports all three in Uganda, put its
 * keys in .env (PAYMENT_*), then implement the two functions below.
 *
 * Flow:
 *  1. startCheckout() creates a PENDING Payment and asks the gateway to charge
 *     the phone (mobile money push) or returns a card checkout URL.
 *  2. The gateway calls /api/payments/webhook. Verify the signature, mark the
 *     Payment SUCCEEDED, and set the Subscription to ACTIVE with a new
 *     currentPeriodEnd. Access is granted only from the webhook, never from the
 *     browser redirect.
 */
import type { PaymentMethod } from "@prisma/client";

export type CheckoutRequest = {
  subscriptionId: string;
  amount: number;
  currency: "UGX";
  method: PaymentMethod;
  phone?: string; // for mobile money, +256...
  email?: string;
};

export type CheckoutResult =
  | { kind: "mobile_money_prompt_sent"; providerRef: string }
  | { kind: "redirect"; url: string; providerRef: string };

export async function startCheckout(_req: CheckoutRequest): Promise<CheckoutResult> {
  throw new Error("Payment provider not configured. See src/lib/payments.ts");
}

export async function verifyWebhook(_rawBody: string, _signature: string | null): Promise<boolean> {
  throw new Error("Payment provider not configured. See src/lib/payments.ts");
}

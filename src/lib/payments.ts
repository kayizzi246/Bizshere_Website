/**
 * Payments through Pesapal API 3.0 (MTN MoMo, Airtel Money and cards on one page):
 * https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference
 *
 * Needs PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in .env. PESAPAL_ENV=sandbox uses the
 * demo server (cybqa.pesapal.com) with test keys; anything else is the live server.
 * PESAPAL_IPN_ID is optional: without it the IPN address (/api/payments/webhook) is looked up or
 * registered once per server process.
 *
 * Flow (src/app/actions/onboarding.ts, src/components/Onboarding.tsx):
 *  1. startCheckout() submits an order (our Payment id is the merchant reference) and returns
 *     Pesapal's payment page, which the pop-up shows in an iframe.
 *  2. Pesapal calls the IPN (/api/payments/webhook) and loads /payments/return in the iframe.
 *     Neither is trusted: both only trigger settlePayment() (src/lib/membership.ts), which asks
 *     Pesapal for the order's status server to server before granting access.
 *  3. cancelOrder() cancels an unpaid order when the person changes plan or closes the pop-up.
 */
import { site } from "@/config/site";

// A value pasted into a host's settings often keeps its quotes or a stray space: drop them.
const setting = (name: string) => (process.env[name] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
const sandbox = () => setting("PESAPAL_ENV").toLowerCase() === "sandbox";
/** True when payments go to the Pesapal sandbox (test money only). */
export const pesapalSandbox = sandbox;
const BASE = () => (sandbox() ? "https://cybqa.pesapal.com/pesapalv3" : "https://pay.pesapal.com/v3");

export const pesapalConfigured = () => Boolean(setting("PESAPAL_CONSUMER_KEY") && setting("PESAPAL_CONSUMER_SECRET"));

export type CheckoutRequest = {
  paymentId: string; // our merchant reference
  amount: number;
  currency: "UGX";
  description: string;
  phone?: string; // +256...
  email?: string;
  name?: string;
};

export type CheckoutResult = { url: string; providerRef: string };

export type OrderStatus = {
  status: "SUCCEEDED" | "FAILED" | "REFUNDED" | "PENDING";
  amount: number | null;
  currency: string | null;
  method: string | null; // e.g. "MTN UG", "Airtel UG", "Visa"
  confirmationCode: string | null;
  merchantReference: string | null;
  paidAt: Date | null;
};

// Tokens last 5 minutes; reuse one until shortly before it runs out.
let token: { value: string; until: number } | null = null;
let ipnId: string | null = null;

async function call<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; auth?: boolean; lenient?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (init.auth !== false) headers.Authorization = `Bearer ${await authToken()}`;
  const res = await fetch(`${BASE()}${path}`, {
    method: init.method ?? "POST",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string } | null };
  // Pesapal also reports failures as HTTP 200 with an `error` object (`lenient`: the caller reads the body itself).
  if (!res.ok || (!init.lenient && body.error && (body.error.code || body.error.message))) {
    throw new Error(`pesapal ${path}: HTTP ${res.status} ${body.error?.code ?? ""} ${body.error?.message ?? ""}`.trim());
  }
  return body;
}

async function authToken() {
  if (token && token.until > Date.now()) return token.value;
  if (!pesapalConfigured()) throw new Error("Pesapal is not configured: set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET");
  const res = await call<{ token?: string; expiryDate?: string }>("/api/Auth/RequestToken", {
    auth: false,
    body: { consumer_key: setting("PESAPAL_CONSUMER_KEY"), consumer_secret: setting("PESAPAL_CONSUMER_SECRET") },
  }).catch((e: Error) => {
    // Sandbox keys only work on the sandbox server and live keys only on the live one: say which was tried.
    throw /invalid_consumer_key/i.test(e.message)
      ? new Error(`${e.message}. Tried the ${sandbox() ? "SANDBOX" : "LIVE"} server: ${sandbox() ? "these must be sandbox keys (developer.pesapal.com), or remove PESAPAL_ENV for live keys" : "these must be live keys, or set PESAPAL_ENV=sandbox for sandbox/demo keys"}`)
      : e;
  });
  if (!res.token) throw new Error("pesapal: no token returned");
  const expires = res.expiryDate ? Date.parse(res.expiryDate) : NaN;
  token = { value: res.token, until: (Number.isFinite(expires) ? expires : Date.now() + 5 * 60_000) - 60_000 };
  return token.value;
}

/** The IPN id for /api/payments/webhook: from .env, else an existing registration, else a new one. */
async function notificationId() {
  if (setting("PESAPAL_IPN_ID")) return setting("PESAPAL_IPN_ID");
  if (!ipnId) ipnId = (await registerIpn()).ipnId;
  return ipnId;
}

/**
 * Finds this site's IPN registration on the Pesapal account in use, or registers it. Pesapal
 * gives a new id for each registration, so an existing one for the same address is reused.
 * `npm run pesapal:ipn` prints the id to put in PESAPAL_IPN_ID.
 */
export async function registerIpn(url = `${site.url}/api/payments/webhook`) {
  const list = await call<{ url: string; ipn_id: string }[]>("/api/URLSetup/GetIpnList", { method: "GET" }).catch(() => []);
  const found = Array.isArray(list) ? list.find((i) => i.url === url) : undefined;
  if (found) return { ipnId: found.ipn_id, url, existing: true };
  const res = await call<{ ipn_id?: string }>("/api/URLSetup/RegisterIPN", { body: { url, ipn_notification_type: "POST" } });
  if (!res.ipn_id) throw new Error("pesapal: IPN not registered");
  return { ipnId: res.ipn_id, url, existing: false };
}

/** Submits the order and returns Pesapal's payment page (shown in the pop-up's iframe). */
export async function startCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  const [first, ...rest] = (req.name ?? "").trim().split(/\s+/);
  const res = await call<{ order_tracking_id?: string; redirect_url?: string }>("/api/Transactions/SubmitOrderRequest", {
    body: {
      id: req.paymentId,
      currency: req.currency,
      amount: req.amount,
      description: req.description.slice(0, 100),
      callback_url: `${site.url}/payments/return`,
      notification_id: await notificationId(),
      billing_address: {
        email_address: req.email ?? "",
        phone_number: req.phone ? req.phone.replace(/^\+256/, "0") : "",
        country_code: "UG",
        first_name: first ?? "",
        last_name: rest.join(" "),
      },
    },
  });
  if (!res.order_tracking_id || !res.redirect_url) throw new Error("pesapal: order not accepted");
  return { url: res.redirect_url, providerRef: res.order_tracking_id };
}

/** The order's status, straight from Pesapal. status_code: 1 completed, 2 failed, 3 reversed, 0 not paid (yet). */
export async function orderStatus(trackingId: string): Promise<OrderStatus> {
  // Unpaid and failed orders also come back with an `error` object ("Pending Payment"…): status_code decides.
  const r = await call<{
    status_code?: number; amount?: number; currency?: string; payment_method?: string;
    confirmation_code?: string; merchant_reference?: string; created_date?: string;
  }>(`/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(trackingId)}`, { method: "GET", lenient: true });
  const status = r.status_code === 1 ? "SUCCEEDED" : r.status_code === 2 ? "FAILED" : r.status_code === 3 ? "REFUNDED" : "PENDING";
  return {
    status,
    amount: typeof r.amount === "number" ? r.amount : null,
    currency: r.currency ?? null,
    method: r.payment_method || null,
    confirmationCode: r.confirmation_code || null,
    merchantReference: r.merchant_reference || null,
    paidAt: status === "SUCCEEDED" && r.created_date ? new Date(r.created_date) : null,
  };
}

/** Cancels an order that is still unpaid (Pesapal allows this once, for pending or failed orders only). */
export async function cancelOrder(trackingId: string): Promise<boolean> {
  try {
    const r = await call<{ status?: string }>("/api/Transactions/CancelOrder", { body: { order_tracking_id: trackingId } });
    return r.status === "200";
  } catch {
    return false;
  }
}

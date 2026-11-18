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
  /** Pesapal's own words for the outcome, e.g. "Insufficient funds" or "Request timed out". */
  reason: string | null;
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

/**
 * The IPN id for /api/payments/webhook: from .env, else an existing registration, else a new one.
 * `fresh`: ignore PESAPAL_IPN_ID, which Pesapal refused (it belongs to other keys or the other server).
 */
let envIpnRefused = false;
async function notificationId(fresh = false) {
  if (fresh) { envIpnRefused = true; ipnId = null; }
  if (setting("PESAPAL_IPN_ID") && !envIpnRefused) return setting("PESAPAL_IPN_ID");
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

/**
 * Pesapal rejects a billing name that holds anything but letters, digits, dashes,
 * underscores, dots, colons and @ — so accents are flattened ("Désiré" -> "Desire"),
 * spaces and anything else left become dashes, and an empty result becomes "Customer".
 */
function billingName(value: string, fallback = "") {
  const clean = value
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Za-z0-9_.:@-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return clean || fallback;
}

/** Submits the order and returns Pesapal's payment page (shown in the pop-up's iframe). */
export async function startCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  const [first, ...rest] = (req.name ?? "").trim().split(/\s+/);
  const submit = async (notification_id: string) => call<{ order_tracking_id?: string; redirect_url?: string }>("/api/Transactions/SubmitOrderRequest", {
    body: {
      id: req.paymentId,
      currency: req.currency,
      amount: req.amount,
      description: req.description.slice(0, 100),
      callback_url: `${site.url}/payments/return`,
      notification_id,
      billing_address: {
        email_address: req.email ?? "",
        phone_number: req.phone ? req.phone.replace(/^\+256/, "0") : "",
        country_code: "UG",
        first_name: billingName(first, "Customer"),
        last_name: billingName(rest.join(" ")),
      },
    },
  });
  const res = await submit(await notificationId()).catch(async (e: Error) => {
    // "Invalid IPN URL ID": the id doesn't belong to these keys. Register the right one and try once more.
    if (!/ipn/i.test(e.message)) throw e;
    console.error(`pesapal: PESAPAL_IPN_ID was refused (${e.message}). Using this account's own IPN registration instead; update or remove PESAPAL_IPN_ID (npm run pesapal:ipn).`);
    return submit(await notificationId(true));
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
    description?: string | null; payment_status_description?: string | null; error?: { message?: string | null } | null;
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
    reason: [r.description, r.error?.message, r.payment_status_description].map((x) => (x ?? "").trim()).find(Boolean)?.slice(0, 300) ?? null,
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

/* ────────────────────────────────────────────────────────────────────────────────────────────────
   Checking the connection from inside the admin (17 Nov 2026).

   When a payment fails on the live site, the reason is in the server's console, where the person
   running the site cannot see it. These checks run the same calls the checkout does and say, in
   plain words, which step failed and what to change. Secrets are never returned — a key is shown
   only as its first four characters and its length, enough to tell two keys apart.
   ──────────────────────────────────────────────────────────────────────────────────────────────── */

export type PaymentCheck = { name: string; state: "ok" | "bad" | "warn"; detail: string; fix?: string };

const masked = (name: string) => {
  const v = setting(name);
  return v ? `${v.slice(0, 4)}…${v.length} characters` : "";
};

export async function pesapalChecks(): Promise<PaymentCheck[]> {
  const checks: PaymentCheck[] = [];
  const url = site.url;
  const live = !sandbox();

  // 1. The website's own address. Everything else is built from it: the page Pesapal sends the
  //    payer back to, and the address Pesapal calls to say the money arrived. A default of
  //    localhost means NEXTAUTH_URL was never set on the server, and nothing can work.
  const localhost = /localhost|127\.0\.0\.1/.test(url);
  checks.push({
    name: "This website's address",
    state: localhost ? "bad" : url.startsWith("https://") ? "ok" : "warn",
    detail: url,
    fix: localhost
      ? "Set NEXTAUTH_URL to the live address (e.g. https://bizsphere-ug.com) in the server's environment variables and redeploy. Pesapal sends the payer back to this address and calls it to confirm payment, so while it says localhost no payment can finish."
      : url.startsWith("https://") ? undefined : "Pesapal requires https. Put the site behind a certificate and set NEXTAUTH_URL to the https address.",
  });

  // 2. The keys, and which Pesapal they belong to. Sandbox keys work only on the demo server and
  //    live keys only on the real one, which is the most common reason for "invalid consumer key".
  const hasKeys = pesapalConfigured();
  checks.push({
    name: "Pesapal keys",
    state: hasKeys ? "ok" : "bad",
    detail: hasKeys ? `Key ${masked("PESAPAL_CONSUMER_KEY")}, secret ${masked("PESAPAL_CONSUMER_SECRET")}` : "Not set",
    fix: hasKeys ? undefined : "Put PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET from your Pesapal account into the server's environment variables and redeploy.",
  });
  checks.push({
    name: "Which Pesapal",
    state: live ? "ok" : "warn",
    detail: live ? "Live — real money (pay.pesapal.com)" : "Sandbox — test money only (cybqa.pesapal.com)",
    fix: live ? undefined : "PESAPAL_ENV is set to sandbox, so nothing here takes real money. Remove PESAPAL_ENV from the server's environment variables and use your live keys.",
  });
  if (process.env.PAYMENT_SIMULATE === "true") {
    checks.push({
      name: "Pretend payments",
      state: "bad",
      detail: "PAYMENT_SIMULATE is on: memberships are granted without anyone paying",
      fix: "Remove PAYMENT_SIMULATE from the live server's environment variables and redeploy. It is for demonstrations only.",
    });
  }

  if (!hasKeys) return checks;

  // 3. The call the checkout makes first. If this fails, nothing downstream is worth testing.
  let signedIn = false;
  try {
    await authToken();
    signedIn = true;
    checks.push({ name: "Signing in to Pesapal", state: "ok", detail: `Accepted by the ${live ? "live" : "sandbox"} server` });
  } catch (e) {
    checks.push({
      name: "Signing in to Pesapal",
      state: "bad",
      detail: (e as Error).message,
      fix: `Pesapal refused these keys on the ${live ? "live" : "sandbox"} server. Sandbox keys work only on the demo server and live keys only on the real one — check you copied the ${live ? "live" : "sandbox"} pair, with no spaces or quotes around them.`,
    });
  }

  // 4. The IPN: the address Pesapal calls when money arrives. Without it a payment can go through
  //    on the phone and never reach the site, which looks exactly like a failure to the payer.
  if (signedIn) {
    const want = `${url}/api/payments/webhook`;
    try {
      const list = await call<{ url: string; ipn_id: string }[]>("/api/URLSetup/GetIpnList", { method: "GET" });
      const found = Array.isArray(list) ? list.find((i) => i.url === want) : undefined;
      const fixed = setting("PESAPAL_IPN_ID");
      checks.push({
        name: "Payment notice address",
        state: found ? (fixed && fixed !== found.ipn_id ? "warn" : "ok") : "warn",
        detail: found
          ? `Registered: ${want}${fixed ? (fixed === found.ipn_id ? " (and PESAPAL_IPN_ID matches)" : ` — but PESAPAL_IPN_ID is set to a different one (${fixed})`) : ""}`
          : `Not registered yet for ${want}. ${Array.isArray(list) && list.length ? `This account has ${list.length} other registration${list.length === 1 ? "" : "s"}.` : "This account has none."}`,
        fix: found
          ? (fixed && fixed !== found.ipn_id ? `Set PESAPAL_IPN_ID to ${found.ipn_id}, or remove it and let the site find its own.` : undefined)
          : "The site registers this by itself the first time someone pays, so this is usually fine. If payments are taken but never confirmed, run `npm run pesapal:ipn` on the server and put the id it prints into PESAPAL_IPN_ID.",
      });
    } catch (e) {
      checks.push({ name: "Payment notice address", state: "bad", detail: (e as Error).message });
    }
  }

  // 5. Can Pesapal actually reach that address? Asked from this server, which is not where Pesapal
  //    asks from, so a failure here is a hint and not a verdict — say so rather than overstate it.
  try {
    const res = await fetch(`${url}/api/payments/webhook`, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(10_000) });
    checks.push({
      name: "Is that address answering?",
      state: "ok",
      detail: `Yes — it replied ${res.status}${res.status === 400 ? " (the right answer to an empty request)" : ""}`,
    });
  } catch (e) {
    checks.push({
      name: "Is that address answering?",
      state: "warn",
      detail: `No reply: ${(e as Error).message}`,
      fix: "The server could not reach its own public address. That is normal on some hosts and does not prove Pesapal cannot reach it — open the address in a browser to be sure. If the browser cannot reach it either, payments will be taken and never confirmed.",
    });
  }

  return checks;
}

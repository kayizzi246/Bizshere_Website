import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { phoneKey } from "./phone-codes";
import { sendSms } from "./sms";
import { site } from "@/config/site";

/**
 * Phone-and-PIN logins for sellers (portal /supplier) and experts (portal /expert).
 *
 * The team registers the login (Admin → Supplier logins / Expert logins): that links the phone
 * to the supplier or expert, gives the account a username and texts a 4-digit PIN. They sign in
 * at /suppliers/login or /experts/login with phone and PIN, or at their personal address
 * (the site address followed by the username, e.g. bizsphere.ug/kampala-bakers) with the PIN alone.
 * The first sign-in asks for their own PIN; a forgotten PIN is reset with a texted code.
 */
export type PinKind = "supplier" | "expert";

export const PORTAL: Record<PinKind, string> = { supplier: "/supplier", expert: "/expert" };
export const LOGIN_PAGE: Record<PinKind, string> = { supplier: "/suppliers/login", expert: "/experts/login" };

const base = () => site.url.replace(/\/$/, "");
export const personalUrl = (username: string) => `${base()}/${username}`;
export const loginUrl = (kind: PinKind) => `${base()}${LOGIN_PAGE[kind]}`;

/** Usernames: lower-case letters, digits and dashes, 3–40 characters, no dash at either end. */
export const USERNAME = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

/**
 * Addresses a username may not take: every top-level page and folder of the site, so a
 * personal sign-in address never hides a real page.
 */
const RESERVED = new Set([
  "about", "account", "admin", "api", "brand", "business-ideas", "contact", "corrections", "demo", "expert", "experts",
  "funding", "guides", "ideas", "illustrations", "login", "logout", "machines", "membership", "methodology", "news",
  "opportunities", "prices", "privacy", "recipes", "samples", "search", "signup", "staff", "supplier", "suppliers",
  "terms", "tools", "uploads", "websites", "icon", "favicon", "robots", "sitemap", "help", "support", "home", "www",
]);

const slugify = (s: string) => s.toLowerCase().replace(/^sample:\s*/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36).replace(/-+$/, "");

/** A free username from a business or person's name: "Kampala Bakers Ltd" → "kampala-bakers-ltd", then -2, -3… */
async function freeUsername(name: string) {
  let stem = slugify(name);
  if (stem.length < 3) stem = `${stem || "user"}-ug`;
  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? stem : `${stem}-${n}`;
    if (RESERVED.has(candidate) || !USERNAME.test(candidate)) continue;
    if (!(await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } }))) return candidate;
  }
  return `${stem}-${randomInt(1000, 9999)}`;
}

/** The account's username, made from `name` the first time. */
export async function ensureUsername(userId: string, name: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (user?.username) return user.username;
  const username = await freeUsername(name);
  await prisma.user.update({ where: { id: userId }, data: { username } });
  return username;
}

/** Find a PIN account by phone number or username, with what it may sign in to. */
export async function pinAccount(raw: string) {
  const login = raw.trim().toLowerCase();
  const phone = phoneKey(raw);
  const where = phone ? { phone } : USERNAME.test(login) ? { username: login } : null;
  if (!where) return null;
  const user = await prisma.user.findUnique({
    where,
    select: {
      id: true, name: true, phone: true, username: true, passwordHash: true, isSuspended: true, pinMustChange: true,
      orgMemberships: { where: { organization: { supplier: { isNot: null } } }, select: { organization: { select: { supplier: { select: { contentItem: { select: { title: true } } } } } } } },
      expertProfile: { select: { fullName: true } },
    },
  });
  if (!user || user.isSuspended) return null;
  const supplierName = user.orgMemberships[0]?.organization.supplier?.contentItem.title.replace(/^Sample:\s*/i, "") ?? null;
  const expertName = user.expertProfile?.fullName ?? null;
  return { ...user, isSupplier: Boolean(supplierName), isExpert: Boolean(expertName), displayName: supplierName ?? expertName ?? user.name };
}

export type PinAccount = NonNullable<Awaited<ReturnType<typeof pinAccount>>>;

/** May this account use this portal? (`any` for the personal address: whichever it has.) */
export const canUse = (a: PinAccount, kind: PinKind | "any") => (kind === "any" ? a.isSupplier || a.isExpert : kind === "supplier" ? a.isSupplier : a.isExpert);

/** Where the account goes after signing in: the seller dashboard first, then the expert one. */
export const portalOf = (a: { isSupplier: boolean; isExpert: boolean }) => (a.isSupplier ? PORTAL.supplier : PORTAL.expert);


const newPin = () => String(randomInt(0, 10_000)).padStart(4, "0");

/** Sets and texts a new PIN; they must choose their own on the next sign-in. Returns whether the SMS went. */
export async function sendPin(userId: string, phone: string, text: (pin: string) => string) {
  const pin = newPin();
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(pin, 10), pinMustChange: true } });
  return sendSms(phone, text(pin));
}

/** Wrong-PIN pauses (src/lib/auth.ts) are lifted once they've proved it's them. */
export const clearFailures = (phone: string) => prisma.auditLog.deleteMany({ where: { action: "auth.login_failed", entityId: phone.toLowerCase() } });

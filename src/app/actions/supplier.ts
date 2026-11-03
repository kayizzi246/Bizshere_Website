"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { randomInt } from "node:crypto";
import { phoneKey, sendCode, verifyCode } from "@/lib/phone-codes";
import { sendSms } from "@/lib/sms";
import { site } from "@/config/site";

/**
 * Supplier portal (/supplier) and the admin's supplier logins (/admin/supplier-logins).
 *
 * A seller signs in at /suppliers/login with their phone and a 4-digit PIN. The team registers the
 * login, which texts them a PIN; on first sign-in they choose their own. A forgotten PIN is reset
 * with a texted one-time code. What makes them a supplier is being a member of
 * the supplier's organisation (OrganizationMember). Every action here checks that membership on
 * the server, so a supplier can only change their own photo, catalog and password.
 */

async function signedIn() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/suppliers/login");
  return session.user;
}

/** The supplier this user may edit, with its page address, or a redirect back to the portal. */
async function ownSupplier(supplierId: string) {
  const user = await signedIn();
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, organization: { members: { some: { userId: user.id } } } },
    include: { contentItem: { select: { slug: true } } },
  });
  if (!supplier) redirect("/supplier?error=access");
  return supplier;
}

const refresh = (slug: string) => { revalidatePath("/supplier"); revalidatePath(`/suppliers/${slug}`); revalidatePath("/suppliers"); };

// Photos: an uploaded file (/uploads/…) or an https address. Nothing else.
const photo = z.string().trim().max(1000).refine((v) => v === "" || v.startsWith("/uploads/") || /^https:\/\//.test(v), "Use the Upload button or an https address.");
const money = z.string().trim().max(20).transform((v) => (v === "" ? null : Number(v.replace(/[,\s]/g, "")))).refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Enter a number");
const text = (max: number) => z.string().trim().max(max).transform((v) => v || null);

export async function saveSupplierPhoto(form: FormData) {
  const supplier = await ownSupplier(String(form.get("supplierId")));
  const url = photo.safeParse(String(form.get("pictureUrl") ?? ""));
  if (!url.success) redirect("/supplier?error=photo");
  await prisma.supplier.update({ where: { id: supplier.id }, data: { pictureUrl: url.data || null } });
  refresh(supplier.contentItem.slug);
  redirect("/supplier?saved=photo");
}

const productSchema = z.object({
  productName: z.string().trim().min(2, "Name the product").max(120),
  specifications: text(1000),
  unit: text(40),
  availability: text(80),
  priceMin: money,
  priceMax: money,
  imageUrl: photo,
});

/** Add a product, or update one when `id` is sent. */
export async function saveProduct(form: FormData) {
  const supplier = await ownSupplier(String(form.get("supplierId")));
  const parsed = productSchema.safeParse(Object.fromEntries(["productName", "specifications", "unit", "availability", "priceMin", "priceMax", "imageUrl"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) redirect(`/supplier?error=product`);
  const { imageUrl, ...rest } = parsed.data;
  const data = { ...rest, imageUrl: imageUrl || null, quotedAt: rest.priceMin !== null || rest.priceMax !== null ? new Date() : null };
  const id = String(form.get("id") ?? "");
  if (id) {
    // Only a product of this supplier.
    const done = await prisma.supplierProductListing.updateMany({ where: { id, supplierId: supplier.id }, data: { ...data, status: "IN_REVIEW" } }); // a change goes back to the team
    if (!done.count) redirect("/supplier?error=access");
  } else {
    await prisma.supplierProductListing.create({ data: { ...data, supplierId: supplier.id, status: "IN_REVIEW" } }); // shows once the team approves it
  }
  refresh(supplier.contentItem.slug);
  redirect(`/supplier?saved=${id ? "updated" : "added"}`);
}

export async function deleteProduct(form: FormData) {
  const supplier = await ownSupplier(String(form.get("supplierId")));
  await prisma.supplierProductListing.deleteMany({ where: { id: String(form.get("id")), supplierId: supplier.id } });
  refresh(supplier.contentItem.slug);
  redirect("/supplier?saved=deleted");
}

// ── Admin: give a supplier a login ──

async function requireStaff() {
  const session = await getSession();
  if (!session?.user || !["EDITOR", "ADMIN"].includes(session.user.role)) redirect("/login?callbackUrl=%2Fadmin%2Fsupplier-logins");
}

// ── Seller PINs: 4 digits, stored as a bcrypt hash in passwordHash ──

const pin = z.string().regex(/^\d{4}$/, "4 digits");
const newPin = () => String(randomInt(0, 10_000)).padStart(4, "0");
const signInUrl = () => `${site.url.replace(/\/$/, "")}/suppliers/login`;

/** Texts a new PIN; the seller must replace it with their own on first sign-in. */
async function sendPin(userId: string, phone: string, text: (code: string) => string) {
  const code = newPin();
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(code, 10), pinMustChange: true } });
  return sendSms(phone, text(code));
}

/** Wrong-PIN pauses (src/lib/auth.ts) are lifted once the seller has proved it's them. */
const clearFailures = (phone: string) => prisma.auditLog.deleteMany({ where: { action: "auth.login_failed", entityId: phone.toLowerCase() } });

async function sellerByPhone(raw: string) {
  const phone = phoneKey(raw);
  if (!phone) return null;
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, passwordHash: true, isSuspended: true, orgMemberships: { where: { organization: { supplier: { isNot: null } } }, select: { userId: true } } },
  });
  return user && !user.isSuspended && user.orgMemberships.length ? { ...user, phone } : null;
}

/**
 * Before the supplier sign-in form signs in: is this phone a registered seller, and does it
 * have a PIN yet? Lets the form say "not registered, call us" instead of "wrong PIN".
 */
export async function sellerStatus(raw: string): Promise<"ok" | "not-registered" | "no-password" | "invalid"> {
  if (!phoneKey(raw)) return "invalid";
  const seller = await sellerByPhone(raw);
  if (!seller) return "not-registered";
  return seller.passwordHash ? "ok" : "no-password";
}

/** Forgot PIN: texts a one-time code to the seller's phone (same codes and limits as phone sign-in). */
export async function requestPinReset(raw: string): Promise<{ ok: true; length: number } | { ok: false; error: string }> {
  const seller = await sellerByPhone(raw);
  if (!seller) return { ok: false, error: "This number isn't registered as a seller." };
  const sent = await sendCode(seller.phone);
  return sent.ok ? { ok: true, length: sent.length } : { ok: false, error: sent.error };
}

/** Forgot PIN, second step: the texted code proves it's them; save the new PIN. The form then signs in with it. */
export async function resetPinWithCode(raw: string, code: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const seller = await sellerByPhone(raw);
  if (!seller) return { ok: false, error: "This number isn't registered as a seller." };
  if (!pin.safeParse(next).success) return { ok: false, error: "Your new PIN must be 4 digits." };
  if (!(await verifyCode(seller.phone, code))) return { ok: false, error: "That code is wrong or has expired. Ask for a new one." };
  await prisma.user.update({ where: { id: seller.id }, data: { passwordHash: await bcrypt.hash(next, 10), pinMustChange: false } });
  await clearFailures(seller.phone);
  return { ok: true };
}

/** The signed-in seller chooses their own PIN (required after a texted PIN, or any time from the portal). */
export async function changeSupplierPassword(form: FormData) {
  const user = await signedIn();
  const next = pin.safeParse(String(form.get("password") ?? ""));
  if (!next.success || form.get("password") !== form.get("confirm")) redirect("/supplier?error=password");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next.data, 10), pinMustChange: false } });
  redirect("/supplier?saved=password");
}

/** Admin: texts the seller a new PIN (when they can't reset it themselves). */
export async function setSupplierPassword(form: FormData) {
  await requireStaff();
  const user = await prisma.user.findUnique({ where: { id: String(form.get("userId")) } });
  if (!user?.phone) redirect("/admin/supplier-logins?error=phone");
  const sent = await sendPin(user.id, user.phone, (code) => `Your new BizSphere-Ug seller PIN is ${code}. Sign in at ${signInUrl()} and choose your own PIN.`);
  redirect(`/admin/supplier-logins?saved=${sent ? "pin" : "pin-not-sent"}`);
}

/** Registers a seller login: links the phone to the supplier and texts them a 4-digit PIN. */
export async function addSupplierLogin(form: FormData) {
  await requireStaff();
  const supplier = await prisma.supplier.findUnique({ where: { id: String(form.get("supplierId")) }, include: { contentItem: { select: { title: true } } } });
  const phone = phoneKey(String(form.get("phone") ?? ""));
  if (!supplier || !phone) redirect("/admin/supplier-logins?error=phone");
  const user = (await prisma.user.findUnique({ where: { phone } })) ?? (await prisma.user.create({ data: { name: phone, phone, role: "USER" } }));
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: supplier.organizationId } },
    update: {},
    create: { userId: user.id, organizationId: supplier.organizationId, role: "OWNER" },
  });
  const name = supplier.contentItem.title.replace(/^Sample:\s*/i, "");
  const sent = await sendPin(user.id, phone, (code) => `${name} is now registered as a seller on BizSphere-Ug. Your PIN is ${code}. Sign in at ${signInUrl()} and choose your own PIN.`);
  revalidatePath("/admin/supplier-logins");
  redirect(`/admin/supplier-logins?saved=${sent ? "1" : "pin-not-sent"}`);
}

export async function removeSupplierLogin(form: FormData) {
  await requireStaff();
  await prisma.organizationMember.deleteMany({ where: { userId: String(form.get("userId")), organizationId: String(form.get("organizationId")) } });
  revalidatePath("/admin/supplier-logins");
  redirect("/admin/supplier-logins?saved=removed");
}

// ── Admin: approve products sellers added or changed (/admin/seller-products) ──

export async function reviewSellerProduct(form: FormData) {
  await requireStaff();
  const decision = String(form.get("decision"));
  const listing = await prisma.supplierProductListing.update({
    where: { id: String(form.get("id")) },
    data: { status: decision === "approve" ? "PUBLISHED" : "ARCHIVED" },
    include: { supplier: { include: { contentItem: { select: { slug: true } } } } },
  });
  refresh(listing.supplier.contentItem.slug);
  revalidatePath("/admin/seller-products");
  redirect(`/admin/seller-products?done=${decision === "approve" ? "approved" : "rejected"}`);
}

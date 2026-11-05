"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { phoneKey } from "@/lib/phone-codes";
import { requireArea } from "@/lib/access";
import { ensureUsername, personalUrl, sendPin } from "@/lib/pin-accounts";

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
  minimumOrderQuantity: money,
  availability: text(80),
  priceMin: money,
  priceMax: money,
  imageUrl: photo,
});

const detailsSchema = z.object({
  address: text(200),
  phone: text(40),
  country: text(60),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email().max(200)]),
  website: z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+/.test(v), "Links start with https://"),
});

/** The seller updates the details at the top of their page. They show at once. */
export async function saveSupplierDetails(form: FormData) {
  const supplier = await ownSupplier(String(form.get("supplierId")));
  const parsed = detailsSchema.safeParse(Object.fromEntries(Object.keys(detailsSchema.shape).map((k) => [k, String(form.get(k) ?? "")])));
  if (!parsed.success) redirect("/supplier?error=details");
  const { address, email, website, ...rest } = parsed.data;
  await prisma.supplier.update({ where: { id: supplier.id }, data: { ...rest, email: email || null, website: website || null } });
  // The address lives on the business's main location
  const place = await prisma.organizationLocation.findFirst({ where: { organizationId: supplier.organizationId }, orderBy: { isPrimary: "desc" } });
  if (place) await prisma.organizationLocation.update({ where: { id: place.id }, data: { physicalAddress: address } });
  else if (address) await prisma.organizationLocation.create({ data: { organizationId: supplier.organizationId, physicalAddress: address, isPrimary: true } });
  refresh(supplier.contentItem.slug);
  redirect("/supplier?saved=details");
}

/** Add a product, or update one when `id` is sent. */
export async function saveProduct(form: FormData) {
  const supplier = await ownSupplier(String(form.get("supplierId")));
  const parsed = productSchema.safeParse(Object.fromEntries(["productName", "specifications", "unit", "minimumOrderQuantity", "availability", "priceMin", "priceMax", "imageUrl"].map((k) => [k, String(form.get(k) ?? "")])));
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

// ── Admin: supplier logins (/admin/supplier-logins) and seller products (/admin/seller-products) ──

/** Admin: texts the seller a new PIN (when they can't reset it themselves). */
export async function setSupplierPassword(form: FormData) {
  await requireArea("suppliers");
  const user = await prisma.user.findUnique({ where: { id: String(form.get("userId")) } });
  if (!user?.phone) redirect("/admin/supplier-logins?error=phone");
  const username = await ensureUsername(user.id, String(form.get("name") ?? user.name));
  const sent = await sendPin(user.id, user.phone, (code) => `Your new BizSphere-Ug seller PIN is ${code}. Sign in at ${personalUrl(username)} and choose your own PIN.`);
  revalidatePath("/admin/supplier-logins");
  redirect(`/admin/supplier-logins?saved=${sent ? "pin" : "pin-not-sent"}`);
}

/** Registers a seller login: links the phone to the supplier, gives it a personal sign-in address and texts a 4-digit PIN. */
export async function addSupplierLogin(form: FormData) {
  await requireArea("suppliers");
  const supplier = await prisma.supplier.findUnique({ where: { id: String(form.get("supplierId")) }, include: { contentItem: { select: { title: true } } } });
  const phone = phoneKey(String(form.get("phone") ?? ""));
  if (!supplier || !phone) redirect("/admin/supplier-logins?error=phone");
  const name = supplier.contentItem.title.replace(/^Sample:\s*/i, "");
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing && (existing.role === "ADMIN" || existing.role === "EDITOR")) redirect("/admin/supplier-logins?error=staff");
  const user = existing ?? (await prisma.user.create({ data: { name, phone, role: "USER" } }));
  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: supplier.organizationId } },
    update: {},
    create: { userId: user.id, organizationId: supplier.organizationId, role: "OWNER" },
  });
  const username = await ensureUsername(user.id, name);
  const sent = await sendPin(user.id, phone, (code) => `${name} is now registered as a seller on BizSphere-Ug. Your PIN is ${code}. Sign in at ${personalUrl(username)} and choose your own PIN.`);
  revalidatePath("/admin/supplier-logins");
  redirect(`/admin/supplier-logins?saved=${sent ? "1" : "pin-not-sent"}`);
}

/** Gives an older login (registered before personal addresses) its personal sign-in address. */
export async function makeSupplierLink(form: FormData) {
  await requireArea("suppliers");
  const user = await prisma.user.findUnique({ where: { id: String(form.get("userId")) }, select: { id: true } });
  if (user) await ensureUsername(user.id, String(form.get("name") ?? ""));
  revalidatePath("/admin/supplier-logins");
  redirect("/admin/supplier-logins?saved=link");
}

export async function removeSupplierLogin(form: FormData) {
  await requireArea("suppliers");
  await prisma.organizationMember.deleteMany({ where: { userId: String(form.get("userId")), organizationId: String(form.get("organizationId")) } });
  revalidatePath("/admin/supplier-logins");
  redirect("/admin/supplier-logins?saved=removed");
}

export async function reviewSellerProduct(form: FormData) {
  await requireArea("suppliers");
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

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_DATA } from "@/lib/cached";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";
import { findOrAddCategory } from "@/lib/categories";

const price = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : String(v).replace(/[,\s]/g, "")), z.coerce.number({ invalid_type_error: "Enter the price as a number, e.g. 125000" }).positive("Enter a price above 0"));

/** The four fields on the price form: market, product, price type and price. */
const observationSchema = z.object({
  marketId: z.string().min(1, "Choose a market"),
  productId: z.string().min(1, "Choose a product"),
  priceType: z.enum(["RETAIL", "WHOLESALE", "FARM_GATE"], { errorMap: () => ({ message: "Choose a price type" }) }),
  price,
});

const firstError = (e: z.ZodError) => Object.values(e.flatten().fieldErrors).flat()[0] ?? "Invalid input";

/** A price is quoted in its product's standard unit, so it compares like-for-like on /prices. */
async function unitOf(productId: string) {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { standardUnit: true } });
  if (!p) redirect("/admin/prices?error=Product+not+found");
  return p.standardUnit;
}

/**
 * Adds today's price. It goes live straight away: the team types prices in themselves. A new day is a
 * new row, so history is kept (blueprint 12); editing is only for correcting mistakes.
 */
export async function addObservation(form: FormData) {
  const editor = await requireArea("prices");
  const parsed = observationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/admin/prices?error=${encodeURIComponent(firstError(parsed.error))}`);
  const { price: amount, ...d } = parsed.data;
  const obs = await prisma.priceObservation.create({
    data: {
      ...d, priceMin: amount, priceMax: amount, currency: "UGX", quotedUnit: (await unitOf(d.productId)) ?? "unit",
      observedAt: new Date(), collectedAt: new Date(), collectorId: editor.id,
      status: "PUBLISHED", verificationResult: "PASSED",
    },
  });
  await linkSupplier(form, d.productId, editor.id);
  await audit(editor.id, "price.added", "price_observation", obs.id);
  refresh();
  // A new value each time, so the page gives the form a new key and it comes back empty.
  redirect(`/admin/prices?added=${Date.now()}`);
}

/** Chooses the supplier linked from a product's row on /prices. Empty clears it. */
export async function setProductSupplier(form: FormData) {
  const editor = await requireArea("prices");
  const productId = String(form.get("productId") ?? "");
  const supplierId = String(form.get("supplierId") ?? "") || null;
  if (supplierId && !(await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } }))) redirect("/admin/prices?error=Supplier+not+found");
  await prisma.product.update({ where: { id: productId }, data: { supplierId } });
  await audit(editor.id, "product.supplier_set", "product", productId, { supplierId });
  revalidatePath("/admin/prices");
  revalidatePath("/prices");
  redirect("/admin/prices?mapped=1");
}

export async function addMarket(form: FormData) {
  const editor = await requireArea("prices");
  const name = String(form.get("name") ?? "").trim();
  if (!name) redirect("/admin/prices?error=Market+name+required");
  const m = await prisma.market.create({ data: { name, marketType: String(form.get("marketType") ?? "") || null, locationId: String(form.get("locationId") ?? "") || null, town: String(form.get("town") ?? "") || null } });
  await audit(editor.id, "market.created", "market", m.id);
  revalidatePath("/admin/prices");
  revalidateTag(SITE_DATA);
  redirect("/admin/prices?saved=market#markets");
}

/** The category chosen on a product form, checked to be one of the "Suppliers and products" categories. */
async function productCategory(form: FormData) {
  const id = String(form.get("categoryId") ?? "");
  if (!id) return null;
  const c = await prisma.category.findFirst({ where: { id, kind: "PRODUCT_CATEGORY" }, select: { id: true } });
  return c?.id ?? null;
}

/**
 * The supplier picked on the price form becomes that product's Supplier link on /prices. Left empty,
 * the product keeps the supplier it has.
 */
async function linkSupplier(form: FormData, productId: string, editorId: string) {
  const supplierId = await productSupplier(form);
  if (!supplierId) return;
  await prisma.product.update({ where: { id: productId }, data: { supplierId } });
  await audit(editorId, "product.supplier_set", "product", productId, { supplierId });
}

/** The supplier chosen on a product form (its Supplier link on /prices), checked to exist. Empty means none. */
async function productSupplier(form: FormData) {
  const id = String(form.get("supplierId") ?? "");
  if (!id) return null;
  const s = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  return s?.id ?? null;
}

const DUPLICATE_PRODUCT = "Another product already has that name and grade.";

export async function addProduct(form: FormData) {
  const editor = await requireArea("prices");
  const name = String(form.get("name") ?? "").trim();
  if (!name) redirect("/admin/prices?error=Product+name+required");
  const s = (k: string) => String(form.get(k) ?? "").trim() || null;
  let id = "";
  try {
    const p = await prisma.product.create({ data: { name, categoryId: await productCategory(form), supplierId: await productSupplier(form), grade: s("grade"), standardUnit: s("standardUnit"), localNames: (s("localNames") ?? "").split(",").map((x) => x.trim()).filter(Boolean) } });
    id = p.id;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") redirect(`/admin/prices?error=${encodeURIComponent(DUPLICATE_PRODUCT)}`);
    throw e;
  }
  await audit(editor.id, "product.created", "product", id);
  refresh();
  redirect("/admin/prices?saved=product#products");
}

/** Adds a product category (Grocery, Produce, Textiles…). It is the same list suppliers use. */
export async function addProductCategory(form: FormData) {
  const editor = await requireArea("prices");
  const name = String(form.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) redirect(`/admin/prices?error=${encodeURIComponent("Enter a category name of 2 to 80 characters.")}#categories`);
  const { category, added } = await findOrAddCategory(prisma, "PRODUCT_CATEGORY", name);
  if (!added) redirect(`/admin/prices?error=${encodeURIComponent(`"${category.name}" is already a category.`)}#categories`);
  await audit(editor.id, "category.created", "category", category.id, { name, kind: "PRODUCT_CATEGORY" });
  refresh();
  revalidatePath("/admin/categories");
  redirect("/admin/prices?saved=category#categories");
}

/** Deletes a product category that nothing uses: no product, supplier or page. */
export async function deleteProductCategory(form: FormData) {
  const editor = await requireArea("prices");
  const id = String(form.get("id") ?? "");
  const c = await prisma.category.findFirst({
    where: { id, kind: "PRODUCT_CATEGORY" },
    include: { _count: { select: { products: true, primaryFor: true, contentLinks: true, orgLinks: true, children: true } } },
  });
  if (!c) redirect("/admin/prices?error=Category+not+found#categories");
  if (Object.values(c._count).some((n) => n > 0)) redirect(`/admin/prices?error=${encodeURIComponent(`"${c.name}" is in use, so it can't be deleted. Move its products to another category first.`)}#categories`);
  await prisma.category.delete({ where: { id } });
  await audit(editor.id, "category.deleted", "category", id, { name: c.name });
  refresh();
  revalidatePath("/admin/categories");
  redirect("/admin/prices?deleted=category#categories");
}

// ─── Edit and delete ──────────────────────────────────────────

function refresh() {
  revalidatePath("/admin/prices");
  revalidatePath("/prices");
  revalidateTag(SITE_DATA);
}

/** Drops review-queue entries still waiting on prices that are about to be deleted, so the queue has no empty rows. */
async function dropPendingReviews(where: { id?: string; marketId?: string; productId?: string }) {
  const ids = (await prisma.priceObservation.findMany({ where, select: { id: true } })).map((o) => o.id);
  if (ids.length) await prisma.submission.deleteMany({ where: { type: "PRICE_OBSERVATION", status: "PENDING", priceObservationId: { in: ids } } });
}

/** Corrects a price that was entered wrongly. The change is written to the audit log with the old values. */
export async function updateObservation(form: FormData) {
  const editor = await requireArea("prices");
  const id = String(form.get("id") ?? "");
  const before = await prisma.priceObservation.findUnique({ where: { id } });
  if (!before) redirect("/admin/prices?error=Price+not+found");
  const parsed = observationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/admin/prices?edit=${id}&error=${encodeURIComponent(firstError(parsed.error))}`);
  const { price: amount, ...d } = parsed.data;
  // Only the four fields on the form change; the date and anything recorded earlier stay as they were.
  await prisma.priceObservation.update({
    where: { id },
    data: {
      ...d, priceMin: amount, priceMax: amount,
      quotedUnit: (await unitOf(d.productId)) ?? before.quotedUnit,
      ...(before.status !== "PUBLISHED" ? { status: "PUBLISHED", verificationResult: "PASSED" } : {}),
    },
  });
  await prisma.submission.updateMany({ where: { type: "PRICE_OBSERVATION", status: "PENDING", priceObservationId: id }, data: { status: "APPROVED", decidedAt: new Date() } });
  await linkSupplier(form, d.productId, editor.id);
  await audit(editor.id, "price.updated", "price_observation", id, { before: JSON.parse(JSON.stringify(before)) });
  refresh();
  redirect("/admin/prices?saved=price");
}

export async function deleteObservation(form: FormData) {
  const editor = await requireArea("prices");
  const id = String(form.get("id") ?? "");
  await dropPendingReviews({ id });
  await prisma.priceObservation.deleteMany({ where: { id } });
  await audit(editor.id, "price.deleted", "price_observation", id);
  refresh();
  redirect("/admin/prices?deleted=price");
}

export async function updateMarket(form: FormData) {
  const editor = await requireArea("prices");
  const id = String(form.get("id") ?? "");
  const s = (k: string) => String(form.get(k) ?? "").trim() || null;
  const name = s("name");
  if (!name) redirect(`/admin/prices?editMarket=${id}&error=Market+name+required`);
  await prisma.market.update({
    where: { id },
    data: { name, marketType: s("marketType"), locationId: s("locationId"), town: s("town"), address: s("address"), operatingDays: s("operatingDays"), contact: s("contact") },
  });
  await audit(editor.id, "market.updated", "market", id);
  refresh();
  redirect("/admin/prices?saved=market#markets");
}

/** Deletes a market and every price recorded at it. */
export async function deleteMarket(form: FormData) {
  const editor = await requireArea("prices");
  const id = String(form.get("id") ?? "");
  await dropPendingReviews({ marketId: id });
  await prisma.market.deleteMany({ where: { id } });
  await audit(editor.id, "market.deleted", "market", id);
  refresh();
  redirect("/admin/prices?deleted=market#markets");
}

export async function updateProduct(form: FormData) {
  const editor = await requireArea("prices");
  const id = String(form.get("id") ?? "");
  const s = (k: string) => String(form.get(k) ?? "").trim() || null;
  const name = s("name");
  if (!name) redirect(`/admin/prices?editProduct=${id}&error=Product+name+required`);
  try {
    await prisma.product.update({
      where: { id },
      data: { name, categoryId: await productCategory(form), supplierId: await productSupplier(form), grade: s("grade"), standardUnit: s("standardUnit"), localNames: (s("localNames") ?? "").split(",").map((x) => x.trim()).filter(Boolean) },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") redirect(`/admin/prices?editProduct=${id}&error=${encodeURIComponent(DUPLICATE_PRODUCT)}`);
    throw e;
  }
  await audit(editor.id, "product.updated", "product", id);
  refresh();
  redirect("/admin/prices?saved=product#products");
}

/** Deletes a product, its prices and the price alerts members set on it. Supplier listings and recipes that used it stay, unlinked. */
export async function deleteProduct(form: FormData) {
  const editor = await requireArea("prices");
  const id = String(form.get("id") ?? "");
  await dropPendingReviews({ productId: id });
  await prisma.product.deleteMany({ where: { id } });
  await audit(editor.id, "product.deleted", "product", id);
  refresh();
  redirect("/admin/prices?deleted=product#products");
}

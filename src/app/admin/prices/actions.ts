"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_DATA } from "@/lib/cached";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireArea } from "@/lib/access";
import { audit } from "@/lib/audit";

const money = z.preprocess((v) => (v === "" || v === null ? undefined : String(v).replace(/[,\s]/g, "")), z.coerce.number().nonnegative().optional());
const intOpt = z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().nonnegative().optional());
const tri = z.preprocess((v) => (v === "" || v === undefined ? undefined : v === "true"), z.boolean().optional());

const observationSchema = z.object({
  marketId: z.string().min(1),
  productId: z.string().min(1),
  observedAt: z.coerce.date(),
  priceType: z.enum(["RETAIL", "WHOLESALE", "FARM_GATE"]),
  priceMin: money,
  priceMax: money,
  currency: z.string().regex(/^[A-Z]{3}$/).default("UGX"),
  quotedUnit: z.string().trim().min(1),
  grade: z.string().trim().optional(),
  packageSize: z.string().trim().optional(),
  quoteCount: intOpt,
  collectionMethod: z.string().trim().optional(),
  includesTax: tri,
  includesTransport: tri,
  notes: z.string().trim().optional(),
  publish: z.boolean(),
})
  .refine((d) => d.priceMin !== undefined || d.priceMax !== undefined, { message: "Enter at least one price", path: ["priceMin"] })
  .refine((d) => d.priceMin === undefined || d.priceMax === undefined || d.priceMin <= d.priceMax, { message: "Min price can't be above highest", path: ["priceMax"] })
  .refine((d) => d.observedAt <= new Date(), { message: "Observation date can't be in the future", path: ["observedAt"] });

/** Adds a dated observation. A new day is a new row, so history is kept (blueprint 12); editing is only for correcting mistakes. */
export async function addObservation(form: FormData) {
  const editor = await requireArea("prices");
  const parsed = observationSchema.safeParse({ ...Object.fromEntries(form), publish: form.get("publish") === "on" });
  if (!parsed.success) redirect(`/admin/prices?error=${encodeURIComponent(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input")}`);
  const { publish, ...d } = parsed.data;
  const obs = await prisma.priceObservation.create({
    data: {
      ...d, grade: d.grade || null, packageSize: d.packageSize || null, collectionMethod: d.collectionMethod || null, notes: d.notes || null,
      collectedAt: new Date(), collectorId: editor.id,
      status: publish ? "PUBLISHED" : "IN_REVIEW",
      verificationResult: publish ? "PASSED" : "NOT_CHECKED",
    },
  });
  if (!publish) await prisma.submission.create({ data: { type: "PRICE_OBSERVATION", priceObservationId: obs.id, submittedById: editor.id } });
  await audit(editor.id, "price.added", "price_observation", obs.id, { publish });
  revalidatePath("/admin/prices");
  revalidateTag(SITE_DATA);
  revalidatePath("/prices");
  revalidateTag(SITE_DATA);
  redirect("/admin/prices?added=1");
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
}

export async function addProduct(form: FormData) {
  const editor = await requireArea("prices");
  const name = String(form.get("name") ?? "").trim();
  if (!name) redirect("/admin/prices?error=Product+name+required");
  const s = (k: string) => String(form.get(k) ?? "").trim() || null;
  const p = await prisma.product.create({ data: { name, variety: s("variety"), grade: s("grade"), standardUnit: s("standardUnit"), localNames: (s("localNames") ?? "").split(",").map((x) => x.trim()).filter(Boolean) } });
  await audit(editor.id, "product.created", "product", p.id);
  revalidatePath("/admin/prices");
  revalidateTag(SITE_DATA);
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
  const parsed = observationSchema.safeParse({ ...Object.fromEntries(form), publish: form.get("publish") === "on" });
  if (!parsed.success) redirect(`/admin/prices?edit=${id}&error=${encodeURIComponent(Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input")}`);
  const { publish, ...d } = parsed.data;
  await prisma.priceObservation.update({
    where: { id },
    data: {
      ...d, grade: d.grade || null, packageSize: d.packageSize || null, collectionMethod: d.collectionMethod || null, notes: d.notes || null,
      includesTax: d.includesTax ?? null, includesTransport: d.includesTransport ?? null, quoteCount: d.quoteCount ?? null,
      priceMin: d.priceMin ?? null, priceMax: d.priceMax ?? null,
      ...(publish && before.status !== "PUBLISHED" ? { status: "PUBLISHED", verificationResult: "PASSED" } : {}),
    },
  });
  if (publish) await prisma.submission.updateMany({ where: { type: "PRICE_OBSERVATION", status: "PENDING", priceObservationId: id }, data: { status: "APPROVED", decidedAt: new Date() } });
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
      data: { name, variety: s("variety"), grade: s("grade"), standardUnit: s("standardUnit"), localNames: (s("localNames") ?? "").split(",").map((x) => x.trim()).filter(Boolean) },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") redirect(`/admin/prices?editProduct=${id}&error=${encodeURIComponent("Another product already has that name, variety and grade.")}`);
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

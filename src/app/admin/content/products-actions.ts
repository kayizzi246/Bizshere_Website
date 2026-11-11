"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma, transaction } from "@/lib/prisma";
import { requireItemArea } from "@/lib/access";
import { audit } from "@/lib/audit";
import { SITE_DATA } from "@/lib/cached";
import { parentIds } from "@/lib/child-data";
import { looseNumber, parseField } from "@/lib/field-parse";
import { MAX_PRODUCTS, PRODUCT_STATUSES, type ProductDraft } from "@/lib/product-import";
import { loadProducts } from "./products-data";

type Result = { ok: true; products: ProductDraft[]; summary: string } | { ok: false; message: string; errors: Record<string, string> };

/**
 * Saves the admin's product window in one go (src/app/admin/content/ProductsManager.tsx): new products,
 * changed ones and removed ones, for one supplier. Every value is checked here, as on the single-product
 * form; if any row has a problem nothing is saved and each problem is named against its row.
 */
export async function saveSupplierProducts(input: { contentItemId: string; products: ProductDraft[]; removed: string[] }): Promise<Result> {
  const editor = await requireItemArea(String(input.contentItemId));
  const p = await parentIds(input.contentItemId);
  const supplier = p ? await prisma.supplier.findFirst({ where: { id: p.record, contentItemId: input.contentItemId }, select: { id: true } }) : null;
  if (!supplier) return { ok: false, message: "This page isn't a supplier.", errors: {} };
  if (input.products.length > MAX_PRODUCTS) return { ok: false, message: `Up to ${MAX_PRODUCTS} products at a time.`, errors: {} };

  const errors: Record<string, string> = {};
  const data = input.products.map((d) => {
    const problems: Record<string, string> = {};
    const num = (name: string, raw: string) => {
      const v = parseField({ name, kind: "decimal" }, looseNumber(String(raw ?? "").trim()), problems);
      return v as Prisma.Decimal | null;
    };
    const name = String(d.productName ?? "").trim();
    if (!name) problems.productName = "a name is needed";
    let priceMin = num("priceMin", d.priceMin), priceMax = num("priceMax", d.priceMax);
    if (priceMin && priceMax && priceMin.greaterThan(priceMax)) [priceMin, priceMax] = [priceMax, priceMin];
    const currency = (String(d.currency ?? "").trim() || "UGX").toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) problems.currency = "currency must be three letters, e.g. UGX";
    const minimumOrderQuantity = num("minimumOrderQuantity", d.minimumOrderQuantity);
    const imageRaw = String(d.imageUrl ?? "").trim();
    const imageUrl = imageRaw ? (parseField({ name: "imageUrl", kind: "url" }, imageRaw, problems) as string) : null;
    // The other photos: uploaded files or https links, at most 7, none twice
    const moreImages = [...new Set((Array.isArray(d.moreImages) ? d.moreImages : []).map((p) => String(p).trim()))].filter((p) => p !== imageUrl && /^(https:\/\/|\/uploads\/)/.test(p)).slice(0, 7);
    const status = PRODUCT_STATUSES.includes(d.status) ? d.status : "PUBLISHED";
    const labels: Record<string, string> = { priceMin: "price from: numbers only", priceMax: "price to: numbers only", minimumOrderQuantity: "minimum order: numbers only", imageUrl: "photo: use Upload, or a link starting with https://" };
    const msg = Object.entries(problems).map(([k, v]) => (k === "productName" || k === "currency" ? v : labels[k] ?? `${k}: ${v}`));
    if (msg.length) errors[d.key] = msg.join("; ");
    const text = (v: string, max = 2000) => (String(v ?? "").trim().slice(0, max) || null);
    return {
      key: d.key, id: d.id,
      row: {
        productName: name.slice(0, 200), priceMin, priceMax, currency, minimumOrderQuantity, imageUrl, moreImages, status,
        unit: text(d.unit, 100), availability: text(d.availability, 200), specifications: text(d.specifications),
      },
    };
  });
  const bad = Object.keys(errors).length;
  if (bad) return { ok: false, message: `Not saved: ${bad} product${bad === 1 ? " needs" : "s need"} fixing (marked in red).`, errors };

  const now = new Date();
  const current = new Map((await prisma.supplierProductListing.findMany({ where: { supplierId: supplier.id } })).map((r) => [r.id, r]));
  const same = (a: unknown, b: unknown) => String(a ?? "") === String(b ?? "");
  let added = 0, changed = 0, removed = 0;

  await transaction(async (tx) => {
    const gone = input.removed.filter((id) => current.has(id));
    if (gone.length) removed = (await tx.supplierProductListing.deleteMany({ where: { id: { in: gone }, supplierId: supplier.id } })).count;
    const fresh = data.filter((d) => !d.id || !current.has(d.id));
    if (fresh.length) {
      added = (await tx.supplierProductListing.createMany({
        data: fresh.map((d) => ({ ...d.row, supplierId: supplier.id, quotedAt: d.row.priceMin || d.row.priceMax ? now : null })),
      })).count;
    }
    for (const d of data) {
      const was = d.id ? current.get(d.id) : undefined;
      if (!was) continue;
      const keys = Object.keys(d.row) as (keyof typeof d.row)[];
      if (keys.every((k) => same(d.row[k], was[k]))) continue; // unchanged: no write (a list compares as its text)
      const priceChanged = !same(d.row.priceMin, was.priceMin) || !same(d.row.priceMax, was.priceMax);
      await tx.supplierProductListing.updateMany({
        where: { id: was.id, supplierId: supplier.id },
        data: { ...d.row, ...(priceChanged ? { quotedAt: d.row.priceMin || d.row.priceMax ? now : null } : {}) },
      });
      changed++;
    }
  }, { timeout: 60000 });

  await audit(editor.id, "products.saved", "supplier", supplier.id, { added, changed, removed });
  revalidatePath(`/admin/content/${input.contentItemId}`);
  revalidateTag(SITE_DATA);
  const parts = [added && `${added} added`, changed && `${changed} changed`, removed && `${removed} removed`].filter(Boolean);
  return { ok: true, products: await loadProducts(supplier.id), summary: parts.length ? `Products saved: ${parts.join(", ")}.` : "No changes to save." };
}

import { prisma } from "@/lib/prisma";
import type { ProductDraft, ProductStatus } from "@/lib/product-import";

/** A supplier's products, as the product window edits them (every value as text). Server only. */
export async function loadProducts(supplierId: string): Promise<ProductDraft[]> {
  const rows = await prisma.supplierProductListing.findMany({ where: { supplierId }, orderBy: { createdAt: "desc" } });
  const text = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return rows.map((r) => ({
    key: r.id, id: r.id,
    productName: r.productName,
    priceMin: text(r.priceMin), priceMax: text(r.priceMax), currency: r.currency,
    unit: text(r.unit), minimumOrderQuantity: text(r.minimumOrderQuantity), availability: text(r.availability),
    specifications: text(r.specifications), imageUrl: text(r.imageUrl), status: r.status as ProductStatus,
  }));
}

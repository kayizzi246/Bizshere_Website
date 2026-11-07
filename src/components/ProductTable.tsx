import { Package } from "lucide-react";
import { moneyRange } from "@/lib/format";

export type ProductRow = {
  id: string; productName: string; specifications: string | null; unit: string | null; minimumOrderQuantity: unknown;
  availability: string | null; priceMin: unknown; priceMax: unknown; currency: string; imageUrl: string | null; status: string;
};

const TONE: Record<string, string> = { PUBLISHED: "bg-brand-tint text-brand-dark", IN_REVIEW: "bg-warn-bg text-warn-fg", DRAFT: "bg-info-bg text-info-fg", ARCHIVED: "bg-bad-bg text-bad-fg" };

/**
 * A supplier's products as one table: everything about a product on one row, with its status and
 * what can be done to it. Used in the seller's dashboard (/supplier), on a supplier's admin page and
 * at /admin/seller-products. Scrolls sideways on a phone.
 */
export function ProductTable<R extends ProductRow>({ rows, statusLabels, supplier, actions }: {
  rows: R[];
  statusLabels: Record<string, string>;
  /** Adds a Supplier column (the admin's list of every supplier's products). */
  supplier?: (row: R) => React.ReactNode;
  actions: (row: R) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="table-base min-w-[860px]">
        <thead>
          <tr>
            <th className="w-16">Photo</th><th>Product</th>{supplier ? <th>Supplier</th> : null}<th>Price</th><th>Package unit</th><th>Min order</th><th>Availability</th><th>Status</th><th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-line bg-page">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
                  {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package aria-hidden className="h-5 w-5 text-ink-muted" />}
                </span>
              </td>
              <td className="min-w-[9rem] max-w-[260px]">
                <span className="block font-bold text-heading">{p.productName.replace(/^Sample:\s*/i, "")}</span>
                {p.specifications ? <span className="line-clamp-2 text-xs text-ink-muted">{p.specifications}</span> : null}
              </td>
              {supplier ? <td>{supplier(p)}</td> : null}
              <td className="whitespace-nowrap font-semibold text-heading">{p.priceMin === null && p.priceMax === null ? <span className="font-normal text-ink-muted">No price</span> : moneyRange(p.priceMin as number, p.priceMax as number, p.currency)}</td>
              <td className="text-ink-soft">{p.unit ?? "—"}</td>
              <td className="whitespace-nowrap text-ink-soft">{p.minimumOrderQuantity !== null ? Number(p.minimumOrderQuantity).toLocaleString("en-UG") : "—"}</td>
              <td className="text-ink-soft">{p.availability ?? "—"}</td>
              <td><span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[p.status] ?? TONE.IN_REVIEW}`}>{statusLabels[p.status] ?? statusLabels.IN_REVIEW}</span></td>
              <td className="min-w-[8.5rem]"><span className="flex flex-wrap items-center justify-end gap-2">{actions(p)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

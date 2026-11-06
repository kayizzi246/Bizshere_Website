import Link from "next/link";
import { LockKeyhole, Package } from "lucide-react";

/** One catalog product as the page passes it: prices are null for visitors (member detail, never sent). */
export type CatalogItem = { id: string; name: string; image: string | null; price: string | null; unit: string | null; availability: string | null; text: string | null; minOrder?: string | null };

/**
 * A supplier's product catalog: a shop-style grid, five across on wide screens. Each card opens
 * the product's own page (/suppliers/[slug]/products/[id]). Products come from the admin's
 * "Product catalog" table or from the supplier at /supplier (shown once the team approves them).
 * Visitors see the products but not the prices.
 */
export function SupplierCatalog({ items, gated, back, title = "Products", wide = true }: { items: CatalogItem[]; gated: boolean; back: string; title?: string; /** Full page width: five across. Beside the contact card, four. */ wide?: boolean }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold text-heading">{title}</h2>
        <span className="text-[13px] text-ink-muted">{items.length} {items.length === 1 ? "product" : "products"}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong bg-white px-5 py-8 text-center text-sm text-ink-muted">This supplier hasn&apos;t added products yet.</p>
      ) : (
        <ul className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 ${wide ? "lg:grid-cols-4 xl:grid-cols-5" : "xl:grid-cols-4"}`}>
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`${back}/products/${p.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-ink">
                <span className="flex aspect-square items-center justify-center overflow-hidden bg-page">
                  {/* Uploaded or editor-entered address; no Next image domain list to maintain. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image ? <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" /> : <Package aria-hidden className="h-10 w-10 text-brand/30" strokeWidth={1.5} />}
                </span>
                <span className="flex flex-1 flex-col gap-1 p-3">
                  <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-heading group-hover:text-brand">{p.name.replace(/^Sample:\s*/i, "")}</span>
                  {p.text ? <span className="line-clamp-2 text-[12px] leading-snug text-ink-muted">{p.text}</span> : null}
                  <span className="mt-auto pt-1.5">
                    {gated ? (
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />See price</span>
                    ) : p.price ? (
                      <span className="text-[14px] font-bold text-brand-dark">{p.price}{p.unit ? <span className="text-[12px] font-normal text-ink-muted"> / {p.unit}</span> : null}</span>
                    ) : <span className="text-[12px] text-ink-muted">Ask for price</span>}
                  </span>
                  {p.minOrder ? <span className="text-[12px] text-ink-muted">Min order: {p.minOrder}</span> : null}
                  {p.availability ? <span className="text-[11px] font-semibold text-[#1F8A5B]">{p.availability}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

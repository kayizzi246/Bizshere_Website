import Link from "next/link";
import { Check, Package, X } from "lucide-react";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { moneyRange } from "@/lib/format";
import { reviewSellerProduct } from "@/app/actions/supplier";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seller products" };

/**
 * Products sellers added or changed in their portal (/supplier). They don't show on the site
 * until approved here; rejected ones stay hidden (the seller sees "Not approved").
 */
export default async function SellerProductsPage({ searchParams }: { searchParams: { done?: string } }) {
  await requireArea("suppliers");
  const waiting = await prisma.supplierProductListing.findMany({
    where: { status: "IN_REVIEW" },
    include: { supplier: { include: { contentItem: { select: { title: true, slug: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Seller products</h1>
        <p className="text-sm text-ink-muted">Products sellers added or changed. Approve to show them on the seller&apos;s page; reject to keep them hidden.</p>
      </div>
      {searchParams.done ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Product {searchParams.done}.</p> : null}
      {waiting.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center text-sm text-ink-muted">Nothing waiting. New products from sellers will appear here.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {waiting.map((p) => (
            <li key={p.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
              <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-page">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package aria-hidden className="h-8 w-8 text-ink-muted" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-bold text-heading">{p.productName}</span>
                <Link href={`/suppliers/${p.supplier.contentItem.slug}`} className="w-fit text-xs font-semibold">{p.supplier.contentItem.title}</Link>
                <span className="text-sm text-ink-soft">{p.priceMin !== null || p.priceMax !== null ? moneyRange(p.priceMin, p.priceMax, p.currency) : "No price"}{p.unit ? ` / ${p.unit}` : ""}{p.availability ? ` · ${p.availability}` : ""}</span>
                {p.specifications ? <span className="line-clamp-3 text-xs text-ink-muted">{p.specifications}</span> : null}
                <span className="mt-1 flex gap-2">
                  <form action={reviewSellerProduct}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="approve" />
                    <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm font-bold text-white hover:bg-brand-dark"><Check aria-hidden className="h-4 w-4" />Approve</button>
                  </form>
                  <form action={reviewSellerProduct}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="decision" value="reject" />
                    <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-bad-fg hover:bg-bad-bg"><X aria-hidden className="h-4 w-4" />Reject</button>
                  </form>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { Check, X } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireArea } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { ProductTable } from "@/components/ProductTable";
import { reviewSellerProduct } from "@/app/actions/supplier";

export const dynamic = "force-dynamic";
export const metadata = { title: "Supplier products" };

const LIMIT = 300;
const STATUS_LABELS = { PUBLISHED: "Live", IN_REVIEW: "Waiting for approval", ARCHIVED: "Hidden" };
const TABS = [
  { key: "waiting", label: "Waiting for approval", status: "IN_REVIEW" },
  { key: "live", label: "Live", status: "PUBLISHED" },
  { key: "hidden", label: "Hidden", status: "ARCHIVED" },
  { key: "all", label: "All products", status: null },
] as const;

/**
 * Every supplier's products in one table. Products sellers add or change in their portal (/supplier)
 * wait here and don't show on the site until approved; hiding one keeps it off the site (the seller
 * sees "Not approved"). Edit opens the product on its supplier's page.
 */
export default async function SellerProductsPage({ searchParams }: { searchParams: { done?: string; show?: string; q?: string; supplier?: string } }) {
  await requireArea("suppliers");
  const q = searchParams.q?.trim();
  const supplierId = searchParams.supplier || undefined;
  const scope: Prisma.SupplierProductListingWhereInput = {
    ...(supplierId ? { supplierId } : {}),
    ...(q ? { OR: [{ productName: { contains: q, mode: "insensitive" } }, { supplier: { contentItem: { title: { contains: q, mode: "insensitive" } } } }] } : {}),
  };
  const counts = await prisma.supplierProductListing.groupBy({ by: ["status"], where: scope, _count: { _all: true } });
  const countOf = (status: string | null) => counts.filter((c) => !status || c.status === status).reduce((n, c) => n + c._count._all, 0);
  // Opens on what needs doing: the waiting products, or everything when nothing is waiting.
  const tab = TABS.find((t) => t.key === searchParams.show) ?? (countOf("IN_REVIEW") ? TABS[0] : TABS[3]);
  const [rows, supplier] = await Promise.all([
    prisma.supplierProductListing.findMany({
      where: { ...scope, ...(tab.status ? { status: tab.status } : {}) },
      include: { supplier: { select: { contentItem: { select: { id: true, title: true } } } } },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
    }),
    supplierId ? prisma.supplier.findUnique({ where: { id: supplierId }, select: { contentItem: { select: { id: true, title: true } } } }) : null,
  ]);
  const link = (key: string) => `/admin/seller-products?${new URLSearchParams({ show: key, ...(q ? { q } : {}), ...(supplierId ? { supplier: supplierId } : {}) })}`;
  const pill = (active: boolean) => `rounded-full px-3 py-1.5 text-[13px] font-semibold ${active ? "bg-brand text-white hover:text-white" : "border border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"}`;
  const decide = (id: string, decision: "approve" | "reject", label: string) => (
    <form action={reviewSellerProduct}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="decision" value={decision} /><input type="hidden" name="show" value={tab.key} />
      {decision === "approve"
        ? <button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-[13px] font-bold text-white hover:bg-brand-dark"><Check aria-hidden className="h-4 w-4" />{label}</button>
        : <button className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-semibold text-bad-fg hover:bg-bad-bg"><X aria-hidden className="h-4 w-4" />{label}</button>}
    </form>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold text-heading">Supplier products{supplier ? `: ${supplier.contentItem.title.replace(/^Sample:\s*/i, "")}` : ""}</h1>
        <p className="text-sm text-ink-muted">Every product from every supplier. Approve a product to show it on the supplier&apos;s page, or hide it to take it off the website.</p>
      </div>
      {searchParams.done ? <p role="status" className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm font-semibold text-brand-dark">Product {searchParams.done}.</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter products" className="flex flex-wrap gap-2">
          {TABS.map((t) => <Link key={t.key} href={link(t.key)} className={pill(t.key === tab.key)}>{t.label} ({countOf(t.status)})</Link>)}
        </nav>
        <form className="flex gap-2">
          <input type="hidden" name="show" value={tab.key} />
          {supplierId ? <input type="hidden" name="supplier" value={supplierId} /> : null}
          <input name="q" type="search" defaultValue={q} placeholder="Find a product or supplier" aria-label="Find a product or supplier" className="input min-h-[42px] w-full max-w-xs text-sm" />
          <button className="btn-outline min-h-[42px] px-4 text-sm">Search</button>
        </form>
      </div>
      {supplier ? <p className="-mt-2 flex flex-wrap gap-4 text-sm"><Link href={`/admin/content/${supplier.contentItem.id}#t-listings`} className="font-semibold">+ Add a product for this supplier</Link><Link href="/admin/seller-products" className="font-semibold">Show every supplier</Link></p> : null}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center text-sm text-ink-muted">{q ? "No products match your search." : `No products under "${tab.label}".`}</p>
      ) : (
        <ProductTable rows={rows} statusLabels={STATUS_LABELS}
          supplier={(p) => <Link href={`/admin/seller-products?show=all&supplier=${p.supplierId}`} className="font-semibold">{p.supplier.contentItem.title.replace(/^Sample:\s*/i, "")}</Link>}
          actions={(p) => (
            <>
              {p.status !== "PUBLISHED" ? decide(p.id, "approve", "Approve") : null}
              {p.status !== "ARCHIVED" ? decide(p.id, "reject", p.status === "PUBLISHED" ? "Hide" : "Reject") : null}
              <Link href={`/admin/content/${p.supplier.contentItem.id}?product=${p.id}#t-listings`} className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-[13px] font-semibold text-ink hover:border-brand hover:text-brand">Edit</Link>
            </>
          )} />
      )}
      {rows.length === LIMIT ? <p className="text-[13px] text-ink-muted">Showing the newest {LIMIT}. Search to find others.</p> : null}
    </div>
  );
}

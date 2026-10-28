import Link from "next/link";
import type { SubmissionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review queue" };

const FILTERS: [string, string][] = [["", "All"], ["NEW_BUSINESS", "New businesses"], ["SUPPLIER_OFFER", "Offers"], ["PRICE_OBSERVATION", "Prices"], ["CORRECTION", "Corrections"]];

export default async function ReviewQueue({ searchParams }: { searchParams: { type?: string; done?: string } }) {
  const type = FILTERS.some(([v]) => v === searchParams.type) ? (searchParams.type as SubmissionType | "") : "";
  const items = await prisma.submission.findMany({
    where: { status: "PENDING", ...(type ? { type } : {}) },
    include: { organization: { include: { locations: { include: { location: true } } } }, supplierOffer: { include: { machine: { include: { contentItem: true } }, supplier: { include: { organization: true } } } }, contentItem: true, submittedBy: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-[22px] font-black tracking-tight text-heading">Review queue</h1>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([v, l]) => (
            <Link key={v} href={v ? `/admin/review?type=${v}` : "/admin/review"} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${type === v ? "bg-brand-deep text-white hover:text-white" : "border border-line bg-surface text-ink-soft"}`}>{l}</Link>
          ))}
        </div>
      </div>
      {searchParams.done ? <div role="status" className="rounded-xl bg-brand-tint px-4 py-3 font-bold text-brand-dark">Decision saved: {searchParams.done.replace("_", " ").toLowerCase()}.</div> : null}
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base min-w-[720px]">
            <thead><tr><th>Item</th><th>Type</th><th>Details</th><th>Submitted</th><th></th></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="font-bold">{s.organization?.legalName ?? s.supplierOffer?.machine.contentItem.title ?? s.contentItem?.title ?? "—"}</td>
                  <td className="capitalize">{s.type.replace("_", " ").toLowerCase()}</td>
                  <td className="text-ink-muted">
                    {s.organization ? `${s.organization.accountType.toLowerCase().replace("_", " ")} · ${s.organization.locations[0]?.location?.name ?? ""}` : null}
                    {s.supplierOffer ? `${s.supplierOffer.supplier.organization.legalName} · ${s.supplierOffer.condition.toLowerCase()}` : null}
                  </td>
                  <td className="text-ink-muted">{date(s.createdAt)} · {s.submittedBy?.name ?? "—"}</td>
                  <td className="text-right"><Link href={`/admin/review/${s.id}`} className="btn-primary min-h-[36px] px-3">Review</Link></td>
                </tr>
              ))}
              {items.length === 0 ? <tr><td colSpan={5} className="text-ink-muted">Nothing waiting for review.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

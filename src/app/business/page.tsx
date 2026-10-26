import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getMyOrganization } from "@/lib/business";
import { checkLabel, date, daysBetween, moneyRange } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business dashboard" };

const STATUS_BADGE: Record<string, string> = { PUBLISHED: "badge-ok", IN_REVIEW: "badge-info", DRAFT: "badge-muted", ARCHIVED: "badge-muted" };

export default async function BusinessDashboard() {
  const { user, org } = await getMyOrganization();
  const since = new Date(Date.now() - 30 * 86_400_000);
  const soon = new Date(Date.now() + 14 * 86_400_000);

  const [offers, reveals, enquiries, saves, pendingReview] = await Promise.all([
    org.supplier ? prisma.supplierOffer.findMany({ where: { supplierId: org.supplier.id }, include: { machine: { include: { contentItem: true } } }, orderBy: { updatedAt: "desc" } }) : Promise.resolve([]),
    prisma.contactReveal.count({ where: { organizationId: org.id, createdAt: { gte: since } } }),
    prisma.enquiry.findMany({ where: { organizationId: org.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    org.supplier ? prisma.savedItem.count({ where: { contentItemId: org.supplier.contentItemId } }) : Promise.resolve(0),
    prisma.submission.findFirst({ where: { organizationId: org.id, type: "NEW_BUSINESS", status: { in: ["PENDING", "CHANGES_REQUESTED"] } } }),
  ]);
  const expiring = offers.filter((o) => o.validUntil && o.validUntil <= soon && o.validUntil >= new Date());
  const checks = org.supplier?.contentItem.checks ?? [];
  const latest = (t: string) => checks.find((c) => c.checkType === t);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {user.name?.split(" ")[0]}</h1><p className="text-ink-muted">Here&apos;s how your business is doing on BizSphere-Ug.</p></div>
        <div className="flex gap-2.5">
          {org.supplier ? <Link href={`/suppliers/${org.supplier.contentItem.slug}`} className="btn-outline">View public profile</Link> : null}
          <Link href="/business/offers/new" className="btn-primary">+ Add an offer</Link>
        </div>
      </div>

      {org.status === "PENDING" || pendingReview ? (
        <section className="rounded-2xl border border-[#B8CCE6] bg-info-bg px-5 py-4 text-info-fg">
          <strong>Your business is being reviewed.</strong> {pendingReview?.status === "CHANGES_REQUESTED" ? `Editor note: ${pendingReview.decisionNote ?? ""}` : "Listings go live once our editors approve your account."}
        </section>
      ) : null}

      {expiring.length ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F0D49A] bg-[#FFF6E5] px-5 py-4">
          <span><strong className="text-[#5C3B00]">{expiring.length} price quote{expiring.length > 1 ? "s" : ""} expire in the next 14 days.</strong> <span className="text-warn-fg">Expired quotes are marked as old on your listings.</span></span>
          <Link href="#listings" className="btn border border-[#D9B66A] bg-white text-[#5C3B00]">Update prices</Link>
        </section>
      ) : null}

      <section className="flex flex-wrap gap-3.5">
        <Kpi label="Live offers" value={offers.filter((o) => o.status === "PUBLISHED").length} />
        <Kpi label="Contact reveals · 30 days" value={reveals} />
        <Kpi label="Enquiries" value={enquiries.filter((e) => e.status === "NEW").length} sub="awaiting reply" />
        <Kpi label="Saved by members" value={saves} />
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section id="listings" className="card flex min-w-0 flex-[999_1_520px] flex-col gap-3.5 p-6">
          <h2 className="text-xl font-extrabold">My listings</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="table-base min-w-[620px]">
              <thead><tr><th>Listing</th><th>Status</th><th>Price quote</th><th></th></tr></thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td><span className="flex flex-col"><span className="font-bold">{o.machine.contentItem.title}</span><span className="text-xs capitalize text-ink-muted">Machine offer · {o.condition.toLowerCase()}</span></span></td>
                    <td><span className={STATUS_BADGE[o.status]}>{o.status.replace("_", " ").toLowerCase()}</span></td>
                    <td><span className="flex flex-col"><span className="font-bold">{moneyRange(o.priceMin, o.priceMax, o.currency)}</span><span className="text-xs text-ink-muted">{o.validUntil ? `Valid to ${date(o.validUntil)} (${daysBetween(new Date(), o.validUntil)} days)` : `Quoted ${date(o.quotedAt)}`}</span></span></td>
                    <td className="text-right"><Link href={`/business/offers/new?machine=${o.machineId}`} className="font-bold">Update</Link></td>
                  </tr>
                ))}
                {offers.length === 0 ? <tr><td colSpan={4} className="text-ink-muted">No offers yet. <Link href="/business/offers/new" className="font-bold">Add your first offer</Link>.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-[1_1_320px] flex-col gap-5">
          <section id="verification" className="card flex flex-col gap-2.5 p-6">
            <h2 className="mb-1 text-lg font-extrabold">Verification</h2>
            {(["BUSINESS_CONTACT", "REGISTRATION", "PHYSICAL_ADDRESS"] as const).map((t) => {
              const c = latest(t);
              return (
                <div key={t} className="flex justify-between gap-2.5 text-sm">
                  <span>{checkLabel[t]}</span>
                  <span className={`font-bold ${c?.result === "PASSED" ? "text-brand-dark" : c?.result === "FAILED" ? "text-bad-fg" : "text-ink-muted"}`}>{c?.result === "PASSED" ? `Checked ${date(c.checkedAt)}` : c?.result === "FAILED" ? "Failed, contact us" : "Not yet checked"}</span>
                </div>
              );
            })}
            <span className="text-xs text-ink-muted">Each check shows on your public profile with its date.</span>
          </section>
          <section className="card flex flex-col gap-1 p-6">
            <h2 className="mb-1.5 text-lg font-extrabold">Latest enquiries</h2>
            {enquiries.length === 0 ? <p className="text-sm text-ink-muted">No enquiries yet.</p> : null}
            {enquiries.map((e) => (
              <div key={e.id} className="flex flex-col border-t border-line py-2.5 text-sm"><span className="text-xs text-ink-muted">{date(e.createdAt)}</span><span>{e.message.slice(0, 120)}</span></div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card flex flex-[1_1_180px] flex-col gap-1.5 px-5 py-4">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-3xl font-extrabold">{value}</span>
      {sub ? <span className="text-xs text-ink-muted">{sub}</span> : null}
    </div>
  );
}

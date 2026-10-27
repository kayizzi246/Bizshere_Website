import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { date, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard" };

const TYPE_BADGE: Record<string, [string, string]> = {
  NEW_BUSINESS: ["badge-info", "New business"],
  SUPPLIER_OFFER: ["badge-muted", "Supplier offer"],
  PRICE_OBSERVATION: ["badge-ok", "Price"],
  CORRECTION: ["badge-bad", "Correction"],
  LISTING: ["badge-muted", "Listing"],
  FUNDING_ROUND: ["badge-muted", "Funding round"],
};

export default async function AdminDashboard() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pending, oldPending, newBiz, overdue, members, revenue, queue, closedOpenRounds, stalePrices, expiringQuotes, failedPayments, activity] = await Promise.all([
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.submission.count({ where: { status: "PENDING", createdAt: { lt: threeDaysAgo } } }),
    prisma.submission.count({ where: { type: "NEW_BUSINESS", createdAt: { gte: weekAgo } } }),
    prisma.contentItem.count({ where: { publicationStatus: "PUBLISHED", nextReviewDueAt: { lt: now } } }),
    prisma.subscription.count({ where: { status: "ACTIVE", userId: { not: null }, plan: { audience: "MEMBER", code: { not: "free" } } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED", paidAt: { gte: monthStart } } }),
    prisma.submission.findMany({ where: { status: "PENDING" }, include: { organization: true, submittedBy: true, supplierOffer: { include: { machine: { include: { contentItem: true } } } }, contentItem: true }, orderBy: { createdAt: "asc" }, take: 6 }),
    prisma.applicationRound.count({ where: { status: "OPEN", closesAt: { lt: now }, isRolling: false } }),
    prisma.priceObservation.count({ where: { status: "PUBLISHED", observedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } } }),
    prisma.supplierOffer.count({ where: { status: "PUBLISHED", validUntil: { gte: now, lt: new Date(now.getTime() + 7 * 86_400_000) } } }),
    prisma.payment.count({ where: { status: "FAILED", createdAt: { gte: monthStart } } }),
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1><p className="text-sm text-ink-muted">Platform health on {date(now)}</p></div>
        <form action="/admin/content" className="flex gap-2"><input name="q" placeholder="Search content" className="input min-h-[44px]" /><button className="btn-outline">Search</button></form>
      </div>

      <section className="flex flex-wrap gap-3.5">
        <Kpi href="/admin/review" label="Waiting for review" value={pending} sub={oldPending ? `${oldPending} older than 3 days` : undefined} warn={!!oldPending} />
        <Kpi href="/admin/review?type=NEW_BUSINESS" label="New business applications" value={newBiz} sub="This week" />
        <Kpi href="/admin/content?fresh=over" label="Overdue for re-review" value={overdue} warn={overdue > 0} />
        <Kpi href="/admin/users?tab=member" label="Paying members" value={members} />
        <Kpi href="/admin/users" label="Revenue this month" value={money(revenue._sum.amount ?? 0)} />
      </section>

      <div className="flex flex-wrap items-start gap-5">
        <section className="card flex min-w-0 flex-[999_1_520px] flex-col gap-3 p-6">
          <div className="flex items-baseline justify-between"><h2 className="text-lg font-extrabold">Review queue</h2><Link href="/admin/review" className="text-sm font-bold">Open queue →</Link></div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="table-base min-w-[600px]">
              <thead><tr><th>Item</th><th>Type</th><th>Submitted by</th><th>Waiting</th><th></th></tr></thead>
              <tbody>
                {queue.map((s) => {
                  const [cls, label] = TYPE_BADGE[s.type];
                  const age = Math.floor((now.getTime() - s.createdAt.getTime()) / 86_400_000);
                  return (
                    <tr key={s.id}>
                      <td className="font-bold">{s.organization?.legalName ?? s.supplierOffer?.machine.contentItem.title ?? s.contentItem?.title ?? "Item"}</td>
                      <td><span className={cls}>{label}</span></td>
                      <td className="text-ink-muted">{s.submittedBy?.name ?? "—"}</td>
                      <td className={age >= 3 ? "font-bold text-warn-fg" : "text-ink-muted"}>{age === 0 ? "Today" : `${age} day${age > 1 ? "s" : ""}`}</td>
                      <td className="text-right"><Link href={`/admin/review/${s.id}`} className="font-bold">Review</Link></td>
                    </tr>
                  );
                })}
                {queue.length === 0 ? <tr><td colSpan={5} className="text-ink-muted">Nothing waiting.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card flex flex-[1_1_320px] flex-col gap-2.5 p-6">
          <h2 className="mb-1 text-lg font-extrabold">Needs attention</h2>
          <Alert tone="bad" href="/admin/content?type=FUNDING_PROGRAMME" show={closedOpenRounds > 0}><strong>{closedOpenRounds} funding round(s)</strong> passed their closing date and still show as open</Alert>
          <Alert tone="warn" href="/admin/content" show={stalePrices > 0}><strong>{stalePrices} market price(s)</strong> are older than 30 days</Alert>
          <Alert tone="warn" href="/admin/content?type=MACHINE" show={expiringQuotes > 0}><strong>{expiringQuotes} supplier quote(s)</strong> expire this week</Alert>
          <Alert tone="muted" href="/admin/users" show={failedPayments > 0}><strong>{failedPayments} failed payment(s)</strong> to follow up</Alert>
          {closedOpenRounds + stalePrices + expiringQuotes + failedPayments === 0 ? <p className="text-sm text-ink-muted">All clear.</p> : null}
        </section>
      </div>

      <section className="card flex flex-col gap-1 p-6">
        <h2 className="mb-2 text-lg font-extrabold">Recent activity</h2>
        {activity.map((a) => (
          <div key={a.id} className="flex flex-wrap justify-between gap-2 border-t border-line py-2.5 text-sm">
            <span><strong>{a.actor?.name ?? "System"}</strong> {a.action.replace(".", " ")} {a.entityType.replace("_", " ")}</span>
            <span className="text-xs text-ink-muted">{date(a.createdAt)}</span>
          </div>
        ))}
      </section>
    </>
  );
}

function Kpi({ href, label, value, sub, warn }: { href: string; label: string; value: number | string; sub?: string; warn?: boolean }) {
  return (
    <Link href={href} className="card flex flex-[1_1_170px] flex-col gap-1.5 p-4 text-ink hover:border-brand hover:text-ink">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-[26px] font-extrabold">{value}</span>
      {sub ? <span className={`text-xs ${warn ? "font-bold text-warn-fg" : "text-ink-muted"}`}>{sub}</span> : null}
    </Link>
  );
}

function Alert({ tone, href, show, children }: { tone: "bad" | "warn" | "muted"; href: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  const cls = { bad: "bg-bad-bg text-[#5E1D13]", warn: "bg-warn-bg text-[#5C3B00]", muted: "bg-[#F2F1EF] text-ink-soft" }[tone];
  return <Link href={href} className={`rounded-xl p-3 text-sm leading-snug hover:opacity-90 ${cls}`}>{children}</Link>;
}

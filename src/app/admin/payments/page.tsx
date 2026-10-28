import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { date, money } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { customerOf, listPayments, METHOD_LABEL, PAYMENT_METHODS, PAYMENT_STATUSES, STATUS_LABEL, type PaymentFilters } from "@/lib/admin-payments";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };

const STATUS_STYLE: Record<string, string> = {
  SUCCEEDED: "bg-brand-tint text-brand-dark",
  PENDING: "bg-warn-bg text-warn-fg",
  FAILED: "bg-bad-bg text-bad-fg",
  REFUNDED: "bg-info-bg text-info-fg",
};

/** Every payment made through the site: who paid, for which plan, how, and whether it went through. */
export default async function PaymentsPage({ searchParams }: { searchParams: PaymentFilters }) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [rows, month, allTime, pending, failed] = await Promise.all([
    listPayments(searchParams),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: "SUCCEEDED", paidAt: { gte: monthStart } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: "SUCCEEDED" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED", createdAt: { gte: monthStart } } }),
  ]);
  const filtered = Boolean(searchParams.status || searchParams.method || searchParams.q);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...searchParams, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `?${s}` : "?";
  };
  const exportHref = `/admin/payments/export${qs({}) === "?" ? "" : qs({})}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-[22px] font-black tracking-tight text-heading">Payments</h1>
          <p className="text-sm text-ink-muted">Membership payments made on the website, newest first.</p>
        </div>
        <a href={exportHref} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-ink hover:border-brand hover:text-brand">
          <Icon name="download" className="h-4 w-4" />Download CSV
        </a>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Received this month" value={money(month._sum.amount ?? 0)} sub={`${month._count} payment${month._count === 1 ? "" : "s"}`} icon="wallet" />
        <Stat label="Received all time" value={money(allTime._sum.amount ?? 0)} sub={`${allTime._count} payment${allTime._count === 1 ? "" : "s"}`} icon="prices" />
        <Stat label="Waiting to confirm" value={String(pending)} sub="Pending payments" icon="calendar" href="?status=PENDING" warn={pending > 0} />
        <Stat label="Failed this month" value={String(failed)} sub="To follow up" icon="flag" href="?status=FAILED" warn={failed > 0} />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-page px-4 focus-within:border-brand">
            <Icon name="search" className="h-4 w-4 shrink-0 text-ink-muted" />
            <span className="sr-only">Search payments</span>
            <input name="q" type="search" defaultValue={searchParams.q} placeholder="Name, email, phone or reference" className="w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted" />
          </label>
          {searchParams.status ? <input type="hidden" name="status" value={searchParams.status} /> : null}
          <select name="method" defaultValue={searchParams.method ?? ""} aria-label="Payment method" className="h-10 rounded-full border border-line bg-surface px-4 text-[13px] text-ink">
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
          </select>
          <button className="btn-primary min-h-[40px] rounded-full px-5">Filter</button>
        </form>

        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div className="inline-flex gap-0.5 rounded-full border border-line bg-page p-1">
            {[["", "All"], ...PAYMENT_STATUSES.map((s) => [s, STATUS_LABEL[s]])].map(([s, l]) => {
              const on = (searchParams.status ?? "") === s;
              return <Link key={s} href={qs({ status: s || undefined })} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ${on ? "bg-surface font-semibold text-heading ring-1 ring-line" : "font-medium text-ink-soft hover:text-heading"}`}>{l}</Link>;
            })}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand"><Icon name="wallet" className="h-5 w-5" /></span>
            <p className="text-sm font-semibold text-heading">{filtered ? "No payments match these filters." : "No payments yet."}</p>
            <p className="text-[13px] text-ink-muted">{filtered ? <Link href="/admin/payments">Clear filters</Link> : "Payments appear here as soon as members pay on the site."}</p>
          </div>
        ) : (
          <>
            {/* Desktop and tablet: table */}
            <div className="hidden overflow-hidden rounded-xl border border-line md:block">
              <table className="table-base">
                <thead><tr><th>Date</th><th>Customer</th><th>Plan</th><th>Method</th><th className="text-right">Amount</th><th>Status</th><th>Reference</th></tr></thead>
                <tbody>
                  {rows.map((p) => {
                    const c = customerOf(p);
                    return (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap text-ink-muted">{date(p.paidAt ?? p.createdAt)}</td>
                        <td><span className="flex flex-col"><span className="font-semibold text-ink">{c.name}</span><span className="text-xs text-ink-muted">{c.contact}</span></span></td>
                        <td><span className="flex flex-col"><span>{p.subscription.plan.name}</span><span className="text-xs capitalize text-ink-muted">{p.subscription.period.toLowerCase()}</span></span></td>
                        <td className="whitespace-nowrap">{METHOD_LABEL[p.method]}</td>
                        <td className="whitespace-nowrap text-right font-semibold text-ink">{money(p.amount, p.currency)}</td>
                        <td><span className={`badge ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                        <td className="max-w-[160px] truncate font-mono text-xs text-ink-muted">{p.providerRef ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Phones: one card per payment */}
            <ul className="flex flex-col gap-2.5 md:hidden">
              {rows.map((p) => {
                const c = customerOf(p);
                return (
                  <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex min-w-0 flex-col"><span className="truncate text-sm font-semibold text-ink">{c.name}</span><span className="truncate text-xs text-ink-muted">{c.contact}</span></span>
                      <span className="shrink-0 text-sm font-bold text-heading">{money(p.amount, p.currency)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <span className={`badge ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                      <span>{METHOD_LABEL[p.method]}</span><span>·</span><span>{p.subscription.plan.name}</span><span>·</span><span>{date(p.paidAt ?? p.createdAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-ink-muted">Showing {rows.length} payment{rows.length === 1 ? "" : "s"}{rows.length === 200 ? " (latest 200; download the CSV for all)" : ""}.</p>
          </>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, sub, icon, href, warn = false }: { label: string; value: string; sub: string; icon: string; href?: string; warn?: boolean }) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-ink-muted">{label}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${warn ? "bg-warn-bg text-warn-fg" : "bg-brand-tint text-brand"}`}><Icon name={icon} className="h-4 w-4" /></span>
      </span>
      <span className="truncate font-sans text-[24px] font-black leading-none tracking-tight text-heading">{value}</span>
      <span className={`text-xs ${warn ? "font-semibold text-warn-fg" : "text-ink-muted"}`}>{sub}</span>
    </>
  );
  const cls = "flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5";
  return href ? <Link href={href} className={`${cls} text-ink transition-colors hover:border-brand hover:text-ink`}>{body}</Link> : <div className={cls}>{body}</div>;
}

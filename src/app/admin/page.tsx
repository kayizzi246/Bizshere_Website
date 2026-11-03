import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { staffAccess } from "@/lib/access";
import { areaLabel, contentArea } from "@/lib/admin-areas";
import { date, money } from "@/lib/format";
import { ADMIN_DIRECTORIES } from "@/lib/content-fields";
import { DIRECTORIES as SITE_DIRECTORIES } from "@/config/directories";
import { customerOf, listPayments, METHOD_LABEL, STATUS_LABEL } from "@/lib/admin-payments";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard" };

const STATUS_STYLE: Record<string, string> = {
  SUCCEEDED: "bg-brand-tint text-brand-dark", PENDING: "bg-warn-bg text-warn-fg", FAILED: "bg-bad-bg text-bad-fg", REFUNDED: "bg-info-bg text-info-fg",
};

// The most common jobs, one tap each, with the area each needs.
const QUICK: [string, string, string, string][] = [
  ["/admin/content/new?type=BUSINESS_IDEA", "idea", "Business idea", contentArea("BUSINESS_IDEA")],
  ["/admin/content/new?type=MACHINE", "machine", "Machine", contentArea("MACHINE")],
  ["/admin/content/new?type=SUPPLIER", "supplier", "Supplier", contentArea("SUPPLIER")],
  ["/admin/content/new?type=FUNDING_PROGRAMME", "funding", "Funding", contentArea("FUNDING_PROGRAMME")],
  ["/admin/content/new?type=GUIDE", "guide", "Guide or book", contentArea("GUIDE")],
  ["/admin/content/new?type=CONSULTANT", "expert", "Expert", contentArea("CONSULTANT")],
  ["/admin/prices", "prices", "Market price", "prices"],
];

/**
 * Dashboard: four numbers that matter, the latest payments, quick actions, what needs
 * attention, and a compact count per directory. Sub-admins see only their own areas.
 */
export default async function AdminDashboard({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await staffAccess();
  const can = user.can;
  const myTypes = ADMIN_DIRECTORIES.filter((d) => can(contentArea(d.type)));
  const canContent = myTypes.length > 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);

  const [pending, oldPending, overdue, members, revenue, payments, closedOpenRounds, stalePrices, expiringQuotes, failedPayments, pendingPayments, corrections, byType] = await Promise.all([
    prisma.submission.count({ where: { status: "PENDING" } }),
    prisma.submission.count({ where: { status: "PENDING", createdAt: { lt: threeDaysAgo } } }),
    prisma.contentItem.count({ where: { publicationStatus: "PUBLISHED", nextReviewDueAt: { lt: now } } }),
    prisma.subscription.count({ where: { status: "ACTIVE", userId: { not: null }, plan: { audience: "MEMBER", code: { not: "free" } } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: "SUCCEEDED", paidAt: { gte: monthStart } } }),
    listPayments({}, 6),
    prisma.applicationRound.count({ where: { status: "OPEN", closesAt: { lt: now }, isRolling: false } }),
    prisma.priceObservation.count({ where: { status: "PUBLISHED", observedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } } }),
    prisma.supplierOffer.count({ where: { status: "PUBLISHED", validUntil: { gte: now, lt: new Date(now.getTime() + 7 * 86_400_000) } } }),
    prisma.payment.count({ where: { status: "FAILED", createdAt: { gte: monthStart } } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.correctionReport.count({ where: { status: "PENDING" } }),
    prisma.contentItem.groupBy({ by: ["contentType", "publicationStatus"], _count: { _all: true } }),
  ]);
  const countOf = (type: string, status?: string) => byType.filter((r) => r.contentType === type && (!status || r.publicationStatus === status)).reduce((n, r) => n + r._count._all, 0);
  const iconOf = (type: string) => SITE_DIRECTORIES.find((d) => d.type === type)?.icon ?? (type === "INVESTMENT_OPPORTUNITY" ? "opportunity" : "link");
  const hour = Number(now.toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Kampala" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const attention = ([
    pending && can("review") ? { href: "/admin/review", text: `${pending} item${pending === 1 ? "" : "s"} waiting for review${oldPending ? ` (${oldPending} older than 3 days)` : ""}`, tone: oldPending ? "warn" : "info" } : null,
    corrections && can("corrections") ? { href: "/admin/corrections", text: `${corrections} correction report${corrections === 1 ? "" : "s"} to check`, tone: "info" } : null,
    pendingPayments && can("payments") ? { href: "/admin/payments?status=PENDING", text: `${pendingPayments} payment${pendingPayments === 1 ? "" : "s"} waiting to confirm`, tone: "warn" } : null,
    failedPayments && can("payments") ? { href: "/admin/payments?status=FAILED", text: `${failedPayments} failed payment${failedPayments === 1 ? "" : "s"} this month`, tone: "bad" } : null,
    overdue && canContent ? { href: "/admin/content?fresh=over", text: `${overdue} page${overdue === 1 ? "" : "s"} overdue for re-review`, tone: "warn" } : null,
    closedOpenRounds && can(contentArea("FUNDING_PROGRAMME")) ? { href: "/admin/content?type=FUNDING_PROGRAMME", text: `${closedOpenRounds} funding round${closedOpenRounds === 1 ? "" : "s"} past closing but still open`, tone: "bad" } : null,
    stalePrices && can("prices") ? { href: "/admin/prices", text: `${stalePrices} market price${stalePrices === 1 ? "" : "s"} older than 30 days`, tone: "warn" } : null,
    expiringQuotes && can(contentArea("MACHINE")) ? { href: "/admin/content?type=MACHINE", text: `${expiringQuotes} supplier quote${expiringQuotes === 1 ? "" : "s"} expire this week`, tone: "warn" } : null,
  ] as ({ href: string; text: string; tone: string } | null | 0)[]).filter((x): x is { href: string; text: string; tone: string } => Boolean(x));
  const quick = QUICK.filter((q) => can(q[3]));
  const kpis = [
    can("payments") ? <Kpi key="revenue" icon="wallet" href="/admin/payments" label="Revenue this month" value={money(revenue._sum.amount ?? 0)} sub={`${revenue._count} payment${revenue._count === 1 ? "" : "s"}`} /> : null,
    can("users") ? <Kpi key="members" icon="users" href="/admin/users?tab=member" label="Paying members" value={members} sub="Active memberships" /> : null,
    can("review") ? <Kpi key="review" icon="inbox" href="/admin/review" label="Waiting for review" value={pending} sub={oldPending ? `${oldPending} older than 3 days` : "Submissions"} warn={oldPending > 0} /> : null,
    canContent ? <Kpi key="due" icon="calendar" href="/admin/content?fresh=over" label="Need re-review" value={overdue} sub="Published pages" warn={overdue > 0} /> : null,
  ].filter(Boolean);
  const TONE: Record<string, string> = { info: "bg-brand", warn: "bg-accent", bad: "bg-bad-fg" };

  return (
    <>
      {/* Greeting */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[24px] font-extrabold tracking-tight text-heading sm:text-[28px]">{greeting}, {user.name?.split(" ")[0] ?? "there"}</h1>
        <p className="text-sm text-ink-muted">Here is what is happening on BizSphere-Ug today, {date(now)}.</p>
      </div>
      {searchParams.denied ? <p role="alert" className="rounded-xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-fg">You don&apos;t have access to {searchParams.denied.startsWith("content") ? "that directory" : areaLabel(searchParams.denied)}. Ask the super admin to add it to your areas.</p> : null}
      {!user.superAdmin ? <p className="-mt-2 text-[13px] text-ink-muted">Your areas: {[...user.areas].map(areaLabel).join(", ") || "none yet. Ask the super admin to give you some."}</p> : null}

      {/* Phones only: the top bar's search is hidden at this width */}
      {canContent ? <form action="/admin/content" role="search" className="-mt-2 flex h-11 w-full items-center gap-2 rounded-[10px] border border-line bg-surface px-4 sm:hidden">
        <Icon name="search" className="h-4 w-4 shrink-0 text-ink-muted" />
        <input name="q" type="search" placeholder="Search content…" aria-label="Search content" className="w-full bg-transparent text-sm text-ink outline-none" />
      </form> : null}

      {/* The four numbers that matter */}
      {kpis.length ? <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{kpis}</section> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Latest payments */}
        {can("payments") ? <Panel title="Latest payments" action={<Link href="/admin/payments" className="text-[13px] font-semibold">View all →</Link>}>
          {payments.length === 0 ? (
            <p className="rounded-xl bg-page p-6 text-center text-sm text-ink-muted">No payments yet. They appear here as soon as members pay on the site.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {payments.map((p) => {
                const c = customerOf(p);
                return (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-page text-xs font-bold text-heading">{c.name.slice(0, 2).toUpperCase()}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-semibold text-ink">{c.name}</span>
                      <span className="truncate text-xs text-ink-muted">{p.subscription.plan.name} · {METHOD_LABEL[p.method]} · {date(p.paidAt ?? p.createdAt)}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold text-heading">{money(p.amount, p.currency)}</span>
                      <span className={`badge ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel> : null}

        <div className={`flex flex-col gap-6 ${can("payments") ? "" : "xl:col-span-2"}`}>
          {/* Quick actions */}
          {quick.length ? <Panel title="Add something new">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2">
              {quick.map(([href, icon, label]) => (
                <Link key={href} href={href} className="group flex items-center gap-2.5 rounded-xl border border-line px-3 py-3 text-[13px] font-semibold text-ink hover:border-brand hover:text-ink">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand group-hover:bg-brand group-hover:text-white"><Icon name={icon} className="h-4 w-4" /></span>
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          </Panel> : null}

          {/* Needs attention */}
          <Panel title="Needs attention">
            {attention.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted"><Icon name="check" className="h-4 w-4 text-brand" />All clear. Nothing needs you right now.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {attention.map((a) => (
                  <li key={a.href + a.text}>
                    <Link href={a.href} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 text-[13px] text-ink hover:bg-page hover:text-ink">
                      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TONE[a.tone]}`} />
                      <span className="flex-1">{a.text}</span>
                      <span aria-hidden className="text-ink-muted">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {/* Content per directory, one compact list */}
      {canContent ? <Panel title="Your content" action={<Link href="/admin/content" className="text-[13px] font-semibold">All content →</Link>}>
        <ul className="grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
          {myTypes.map((d) => (
            <li key={d.type} className="flex items-center gap-3 border-b border-line py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-page text-brand"><Icon name={iconOf(d.type)} className="h-4 w-4" /></span>
              <Link href={`/admin/content?type=${d.type}`} className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink hover:text-brand">{d.label}</Link>
              <span className="text-[13px] text-ink-muted"><strong className="text-heading">{countOf(d.type, "PUBLISHED")}</strong> live{countOf(d.type, "DRAFT") ? ` · ${countOf(d.type, "DRAFT")} draft` : ""}</span>
              <Link href={`/admin/content/new?type=${d.type}`} aria-label={`Add ${d.label.toLowerCase()}`} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted hover:border-brand hover:text-brand"><Icon name="plus" className="h-3.5 w-3.5" /></Link>
            </li>
          ))}
        </ul>
      </Panel> : null}
    </>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-6 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-heading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ href, label, value, sub, warn = false, icon }: { href: string; label: string; value: number | string; sub: string; warn?: boolean; icon: string }) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-ink transition-colors hover:border-brand hover:text-ink sm:p-6">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-ink-muted">{label}</span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${warn ? "bg-warn-bg text-warn-fg" : "bg-brand-tint text-brand"}`}><Icon name={icon} className="h-4 w-4" /></span>
      </span>
      <span className="truncate font-display text-[26px] font-bold leading-none tracking-tight text-heading sm:text-[30px]">{value}</span>
      <span className={`text-xs ${warn ? "font-semibold text-warn-fg" : "text-ink-muted"}`}>{sub}</span>
    </Link>
  );
}

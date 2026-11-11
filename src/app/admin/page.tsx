import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { staffAccess } from "@/lib/access";
import { areaLabel, contentArea } from "@/lib/admin-areas";
import { date, money } from "@/lib/format";
import { ADMIN_DIRECTORIES } from "@/lib/content-fields";
import { DIRECTORIES as SITE_DIRECTORIES } from "@/config/directories";
import { customerOf, listPayments, METHOD_LABEL, STATUS_LABEL } from "@/lib/admin-payments";
import { Icon } from "@/components/Icon";
import { waitingPartners } from "@/lib/partners";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard" };

const STATUS_STYLE: Record<string, string> = {
  SUCCEEDED: "bg-brand-tint text-brand-dark", PENDING: "bg-warn-bg text-warn-fg", FAILED: "bg-bad-bg text-bad-fg", REFUNDED: "bg-info-bg text-info-fg",
};

// "How do I…?": the common jobs as short numbered directions, each with one button that starts it,
// and the area each needs. Written for someone doing it for the first time.
const GUIDES: { title: string; steps: string[]; href: string; start: string; area: string }[] = [
  { title: "Add a supplier and their products", area: contentArea("SUPPLIER"), href: "/admin/content/new?type=SUPPLIER", start: "Add a supplier",
    steps: ["Type the business name and what they sell.", "Add their phone and a photo.", "List their products under \"Products they sell\".", "Press Save. They are live on the website straight away."] },
  { title: "Let a supplier manage their own page", area: "suppliers", href: "/admin/supplier-logins", start: "Open supplier logins",
    steps: ["Choose the supplier and type their phone number.", "We text them a PIN.", "They sign in and add their own products.", "You approve each product under Supplier products."] },
  { title: "Approve what suppliers and experts send", area: "suppliers", href: "/admin/seller-products", start: "Open supplier products",
    steps: ["Open Supplier products.", "Look at the name, photo and price.", "Press Approve to show it, or Hide if it is wrong."] },
  { title: "Add a business idea", area: contentArea("BUSINESS_IDEA"), href: "/admin/content/new?type=BUSINESS_IDEA", start: "Add a business idea",
    steps: ["Type the name, a short brief and choose a category.", "Fill in the main details: capital, requirements, location.", "Add a picture.", "Press Save, then add the start-up budget on its page."] },
  { title: "Add a funding source", area: contentArea("FUNDING_PROGRAMME"), href: "/admin/content/new?type=FUNDING_PROGRAMME", start: "Add a funding source",
    steps: ["Type the fund name and choose the fund type (loan, grant…).", "Type the amounts as plain numbers; the currency can be UGX or USD.", "Add the funder's phone and website.", "Press Save."] },
  { title: "Update today's market prices", area: "prices", href: "/admin/prices", start: "Open market prices",
    steps: ["Choose the product and the market.", "Type the price and the unit.", "Press Add. It shows on the website at once."] },
  { title: "Check a payment or a member", area: "payments", href: "/admin/payments", start: "Open payments",
    steps: ["Open Payments.", "Search by name or phone.", "Green means paid; orange means still waiting."] },
  { title: "Add someone to the admin team", area: "__super", href: "/admin/team", start: "Open the admin team",
    steps: ["Type their name and phone number.", "Choose Everything, or tap what they may manage.", "Press Add to the team. They get a text to sign in."] },
  { title: "Change the WhatsApp number and contact details", area: "homepage", href: "/admin/settings", start: "Open contact details",
    steps: ["Open Contact details.", "Type the new number, email or address.", "Press Save. The website updates at once."] },
];

/**
 * Dashboard, redesigned on 11 Nov 2026 (client: easier to manage, linked to the website, clear in light and
 * dark, with directions): 1. what to do today, as numbered steps; 2. every part of the website as a card with
 * Add, Manage and See on website; 3. the numbers and latest payments; 4. "How do I…?" directions that fold open.
 * Only theme colours are used (surface, page, ink, line…), so it reads the same in light and dark mode.
 * Sub-admins see only their own areas.
 */
export default async function AdminDashboard({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await staffAccess();
  const can = user.can;
  const myTypes = ADMIN_DIRECTORIES.filter((d) => can(contentArea(d.type)));
  const canContent = myTypes.length > 0;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000);

  const [pending, oldPending, overdue, members, revenue, payments, closedOpenRounds, stalePrices, expiringQuotes, failedPayments, pendingPayments, corrections, byType, newPartners, waitingProducts, newLeads] = await Promise.all([
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
    waitingPartners(),
    prisma.supplierProductListing.count({ where: { status: "IN_REVIEW" } }),
    prisma.lead.count({ where: { status: "NEW" } }).catch(() => 0),
  ]);
  const countOf = (type: string, status?: string) => byType.filter((r) => r.contentType === type && (!status || r.publicationStatus === status)).reduce((n, r) => n + r._count._all, 0);
  const iconOf = (type: string) => SITE_DIRECTORIES.find((d) => d.type === type)?.icon ?? (type === "INVESTMENT_OPPORTUNITY" ? "opportunity" : "link");
  const hour = Number(now.toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Kampala" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const attention = ([
    newLeads && can("leads") ? { href: "/admin/leads", text: `${newLeads} lead${newLeads === 1 ? "" : "s"} waiting for a call back`, tone: "warn" } : null,
    newPartners && can("suppliers") ? { href: "/admin/partners", text: `${newPartners} new supplier${newPartners === 1 ? "" : "s"} or expert${newPartners === 1 ? "" : "s"} paid and waiting for approval`, tone: "warn" } : null,
    waitingProducts && can("suppliers") ? { href: "/admin/seller-products", text: `${waitingProducts} supplier product${waitingProducts === 1 ? "" : "s"} waiting for approval`, tone: "info" } : null,
    pending && can("review") ? { href: "/admin/review", text: `${pending} item${pending === 1 ? "" : "s"} waiting for review${oldPending ? ` (${oldPending} older than 3 days)` : ""}`, tone: oldPending ? "warn" : "info" } : null,
    corrections && can("corrections") ? { href: "/admin/corrections", text: `${corrections} reported mistake${corrections === 1 ? "" : "s"} to check`, tone: "info" } : null,
    pendingPayments && can("payments") ? { href: "/admin/payments?status=PENDING", text: `${pendingPayments} payment${pendingPayments === 1 ? "" : "s"} waiting to confirm`, tone: "warn" } : null,
    failedPayments && can("payments") ? { href: "/admin/payments?status=FAILED", text: `${failedPayments} failed payment${failedPayments === 1 ? "" : "s"} this month`, tone: "bad" } : null,
    overdue && canContent ? { href: "/admin/content?fresh=over", text: `${overdue} page${overdue === 1 ? "" : "s"} overdue for re-review`, tone: "warn" } : null,
    closedOpenRounds && can(contentArea("FUNDING_PROGRAMME")) ? { href: "/admin/content?type=FUNDING_PROGRAMME", text: `${closedOpenRounds} funding round${closedOpenRounds === 1 ? "" : "s"} past closing but still open`, tone: "bad" } : null,
    stalePrices && can("prices") ? { href: "/admin/prices", text: `${stalePrices} market price${stalePrices === 1 ? "" : "s"} older than 30 days`, tone: "warn" } : null,
    expiringQuotes && can(contentArea("MACHINE")) ? { href: "/admin/content?type=MACHINE", text: `${expiringQuotes} supplier quote${expiringQuotes === 1 ? "" : "s"} expire this week`, tone: "warn" } : null,
  ] as ({ href: string; text: string; tone: string } | null | 0)[]).filter((x): x is { href: string; text: string; tone: string } => Boolean(x));
  const guides = GUIDES.filter((g) => (g.area === "__super" ? user.superAdmin : can(g.area)));
  // Where each directory is on the public website
  const siteHref = (type: string) => SITE_DIRECTORIES.find((d) => d.type === type)?.href ?? (type === "INVESTMENT_OPPORTUNITY" ? "/opportunities" : "/");
  const kpis = [
    can("payments") ? <Kpi key="revenue" icon="wallet" href="/admin/payments" label="Revenue this month" value={money(revenue._sum.amount ?? 0)} sub={`${revenue._count} payment${revenue._count === 1 ? "" : "s"}`} /> : null,
    can("users") ? <Kpi key="members" icon="users" href="/admin/users?tab=member" label="Paying members" value={members} sub="Active memberships" /> : null,
    can("review") ? <Kpi key="review" icon="inbox" href="/admin/review" label="Waiting for review" value={pending} sub={oldPending ? `${oldPending} older than 3 days` : "Submissions"} warn={oldPending > 0} /> : null,
    canContent ? <Kpi key="due" icon="calendar" href="/admin/content?fresh=over" label="Need re-review" value={overdue} sub="Published pages" warn={overdue > 0} /> : null,
  ].filter(Boolean);

  const BTN: Record<string, string> = { info: "bg-brand text-white", warn: "bg-accent text-ink", bad: "bg-bad-fg text-white" };
  const stepNo = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[14px] font-bold";

  return (
    <>
      {/* Greeting, and the way to the website */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[24px] font-extrabold tracking-tight text-heading sm:text-[28px]">{greeting}, {user.name?.split(" ")[0] ?? "there"}</h1>
          <p className="text-sm text-ink-muted">{date(now)}. Start with step 1 below, then work down the page.</p>
        </div>
        <Link href="/" target="_blank" className="btn-outline gap-2 text-sm"><Icon name="link" className="h-4 w-4" />Open the website ↗</Link>
      </div>
      {searchParams.denied ? <p role="alert" className="rounded-xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-fg">You don&apos;t have access to {searchParams.denied.startsWith("content") ? "that directory" : areaLabel(searchParams.denied)}. Ask the super admin to add it to your areas.</p> : null}
      {!user.superAdmin ? <p className="-mt-2 text-[13px] text-ink-muted">Your areas: {[...user.areas].map(areaLabel).join(", ") || "none yet. Ask the super admin to give you some."}</p> : null}

      {/* Phones only: the top bar's search is hidden at this width */}
      {canContent ? <form action="/admin/content" role="search" className="-mt-2 flex h-11 w-full items-center gap-2 rounded-[10px] border border-line bg-surface px-4 sm:hidden">
        <Icon name="search" className="h-4 w-4 shrink-0 text-ink-muted" />
        <input name="q" type="search" placeholder="Search content…" aria-label="Search content" className="w-full bg-transparent text-sm text-ink outline-none" />
      </form> : null}

      {/* ── 1. What to do today: each waiting job as a numbered step with one button ── */}
      <Panel step="1" title="To do today" note={attention.length ? "These are waiting for you. Do them from the top." : undefined}>
        {attention.length === 0 ? (
          <p className="flex items-center gap-3 rounded-xl bg-page p-4 text-sm text-ink"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand"><Icon name="check" className="h-4 w-4" /></span>All clear. Nothing is waiting for you. You can add something new in step 2.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {attention.map((a, n) => (
              <li key={a.href + a.text}>
                <Link href={a.href} className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 text-ink transition-colors hover:border-brand hover:text-ink">
                  <span className={`${stepNo} bg-page text-heading`}>{n + 1}</span>
                  <span className="min-w-0 flex-1 text-[14px] font-semibold">{a.text}</span>
                  <span className={`inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-[13px] font-semibold ${BTN[a.tone]}`}>Open →</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {/* ── 2. Every part of the website: add to it, manage it, or see it as visitors do ── */}
      {canContent || can("prices") ? <Panel step="2" title="Your website" note="Each box is one part of the website. Add to it, manage what is there, or see how it looks to visitors.">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {myTypes.map((d) => (
            <li key={d.type} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={iconOf(d.type)} className="h-5 w-5" /></span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-[15px] font-bold text-heading">{SITE_DIRECTORIES.find((x) => x.type === d.type)?.title ?? d.label}</span>
                  <span className="text-[12px] text-ink-muted"><strong className="text-ink">{countOf(d.type, "PUBLISHED")}</strong> on the website{countOf(d.type, "DRAFT") ? ` · ${countOf(d.type, "DRAFT")} draft` : ""}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/content/new?type=${d.type}`} className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-dark hover:text-white"><Icon name="plus" className="h-3.5 w-3.5" />Add</Link>
                <Link href={`/admin/content?type=${d.type}`} className="inline-flex h-9 items-center rounded-lg border border-line px-3 text-[13px] font-semibold text-ink hover:border-brand hover:text-brand">Manage</Link>
                <Link href={siteHref(d.type)} target="_blank" className="inline-flex h-9 items-center rounded-lg px-2 text-[13px] font-semibold text-brand hover:text-brand-dark">See on website ↗</Link>
              </div>
            </li>
          ))}
          {can("prices") ? (
            <li className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name="prices" className="h-5 w-5" /></span>
                <span className="flex min-w-0 flex-col"><span className="truncate font-display text-[15px] font-bold text-heading">Market prices</span><span className="text-[12px] text-ink-muted">{stalePrices ? `${stalePrices} older than 30 days` : "Up to date"}</span></span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/admin/prices" className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-dark hover:text-white"><Icon name="plus" className="h-3.5 w-3.5" />Add or update</Link>
                <Link href="/prices" target="_blank" className="inline-flex h-9 items-center rounded-lg px-2 text-[13px] font-semibold text-brand hover:text-brand-dark">See on website ↗</Link>
              </div>
            </li>
          ) : null}
        </ul>
      </Panel> : null}

      {/* ── 3. The numbers, and the money coming in ── */}
      {kpis.length || can("payments") ? <Panel step="3" title="How the site is doing" note="Tap a number to see what is behind it.">
        {kpis.length ? <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{kpis}</section> : null}
        {can("payments") ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-heading">Latest payments</h3><Link href="/admin/payments" className="text-[13px] font-semibold">View all →</Link></div>
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
          </div>
        ) : null}
      </Panel> : null}

      {/* ── 4. Directions: tap a question to see the steps, then one button starts it ── */}
      {guides.length ? <Panel step="4" title="How do I…?" note="Tap a question to see the steps.">
        <div className="grid gap-2 lg:grid-cols-2">
          {guides.map((g) => (
            <details key={g.title} className="group/guide rounded-xl border border-line bg-surface [&>summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 text-[14px] font-semibold text-ink hover:text-brand">{g.title}<span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-ink-muted transition-transform group-open/guide:rotate-45">+</span></summary>
              <div className="flex flex-col gap-3 border-t border-line p-3.5">
                <ol className="flex flex-col gap-2">
                  {g.steps.map((t, n) => (
                    <li key={t} className="flex items-start gap-2.5 text-[13px] text-ink-soft"><span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11px] font-bold text-brand-dark">{n + 1}</span>{t}</li>
                  ))}
                </ol>
                <Link href={g.href} className="btn-primary min-h-[40px] w-fit px-4 text-[13px]">{g.start} →</Link>
              </div>
            </details>
          ))}
        </div>
      </Panel> : null}
    </>
  );
}

function Panel({ title, note, step, children }: { title: string; note?: string; step?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <div className="flex items-center gap-3">
        {step ? <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand font-display text-[15px] font-bold text-white">{step}</span> : null}
        <div className="flex min-w-0 flex-col">
          <h2 className="text-lg font-extrabold text-heading">{title}</h2>
          {note ? <p className="text-[13px] text-ink-muted">{note}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Kpi({ href, label, value, sub, warn = false, icon }: { href: string; label: string; value: number | string; sub: string; warn?: boolean; icon: string }) {
  return (
    <Link href={href} className="group flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-page p-4 text-ink transition-colors hover:border-brand hover:text-ink">
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-ink-muted">{label}</span>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${warn ? "bg-warn-bg text-warn-fg" : "bg-brand-tint text-brand"}`}><Icon name={icon} className="h-4 w-4" /></span>
      </span>
      <span className="truncate font-display text-[26px] font-bold leading-none tracking-tight text-heading sm:text-[30px]">{value}</span>
      <span className={`text-xs ${warn ? "font-semibold text-warn-fg" : "text-ink-muted"}`}>{sub}</span>
    </Link>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DIRECTORIES } from "@/config/directories";
import { contentTypeLabel, date, itemHref, money } from "@/lib/format";
import { budgetTotal } from "@/lib/costing";
import { Icon } from "@/components/Icon";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { liveSiteUpdates } from "@/lib/site-updates";
import { getViewer } from "@/lib/access";
import { googleEnabled } from "@/lib/auth";
import { OnboardingGate } from "@/components/Onboarding";

export const dynamic = "force-dynamic";

/**
 * Homepage. Every number and record shown comes from the database or is a true
 * product fact. No invented customer logos, testimonials or user counts.
 */

const TYPE_ICON: Record<string, string> = { BUSINESS_IDEA: "idea", MACHINE: "machine", SUPPLIER: "supplier", FUNDING_PROGRAMME: "funding", CONSULTANT: "expert", GUIDE: "guide", TOOL: "tool", RECIPE: "recipe", NEWS: "news", WEBSITE: "link" };

// Hero pills: [icon, title, text, icon colours]. Product facts only, no invented numbers.
const HERO_PILLS: [string, string, string, string][] = [
  ["check", "All in one", "10 connected directories", "bg-brand text-white"],
  ["calendar", "Dated and sourced", "Every price shows its date", "bg-white text-ink"],
  ["funding", "Mobile money", "Pay with MoMo or Airtel", "bg-brand-mint text-ink"],
];

const FAQ: [string, string][] = [
  ["Is BizSphere-Ug free to use?", "Yes. You can search everything and read a preview of every page for free. A membership unlocks full budgets, contacts, funding terms, price history and downloads."],
  ["Where does the information come from?", "From official sources, supplier quotations, market visits and providers' published terms. Each page lists its sources and the date it was last reviewed."],
  ["What does “checked” mean on a supplier?", "We say exactly what we checked and when, for example “Business contact checked on 12 March”. A checked contact doesn't guarantee product quality, so always confirm terms before you pay."],
  ["How do I pay for membership?", "With MTN Mobile Money, Airtel Money or a card. You can cancel any time from your account."],
  ["I run a business. Can I be listed?", "Yes. Contact our team with your business details. We add every listing ourselves and check it before it goes live."],
];

export default async function HomePage() {
  const [viewer, memberPlan, idea, guides, updates, typeCounts, priceCount] = await Promise.all([
    getViewer(),
    prisma.membershipPlan.findUnique({ where: { code: "member" } }),
    prisma.contentItem.findFirst({
      where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED" },
      include: {
        primaryCategory: true,
        businessIdea: { include: { steps: { orderBy: { stepNumber: "asc" }, take: 3 }, scenarios: { where: { level: "STANDARD" }, include: { lines: { orderBy: { displayOrder: "asc" } } } } } },
        relatedFrom: { where: { toItem: { publicationStatus: "PUBLISHED" } }, include: { toItem: true }, take: 6, orderBy: { displayOrder: "asc" } },
      },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.contentItem.findMany({
      where: { contentType: { in: ["GUIDE", "TOOL", "RECIPE", "NEWS"] }, publicationStatus: "PUBLISHED" },
      orderBy: [{ lastReviewedAt: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }],
      take: 6,
    }),
    liveSiteUpdates(),
    prisma.contentItem.groupBy({ by: ["contentType"], where: { publicationStatus: "PUBLISHED" }, _count: { _all: true } }),
    prisma.priceObservation.count({ where: { status: "PUBLISHED" } }),
  ]);
  const scenario = idea?.businessIdea?.scenarios[0];
  const counts = new Map(typeCounts.map((c) => [c.contentType, c._count._all]));
  // Directory cards open the onboarding pop-up (sign up → pay) for anyone without full access.
  const onboard = viewer.isMember ? undefined : "";
  const plan = {
    name: memberPlan?.name ?? "Member",
    monthly: memberPlan?.priceMonthly != null ? money(memberPlan.priceMonthly, memberPlan.currency) : null,
    yearly: memberPlan?.priceYearly != null ? money(memberPlan.priceYearly, memberPlan.currency) : null,
  };

  return (
    <>
      {/* ── Hero: a rounded black panel inset from the page, the floating header sits on top ── */}
      <section className="relative -mt-[68px] px-3 pt-3 sm:px-4">
        <div className="relative overflow-hidden rounded-[28px] bg-ink sm:rounded-[40px]">
          {/* Warm orange light and a faint grid */}
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,#000,transparent_70%)]" />

          <div className="hero-rise relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-5 pb-10 pt-24 text-center sm:pt-28">
            <Link href="/search" className="group inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm text-white ring-1 ring-white/15 transition hover:bg-white/15 hover:text-white">
              <span className="rounded-full bg-brand px-2.5 py-0.5 font-display text-[11px] font-extrabold tracking-wide text-white">NEW</span>
              Search every directory with its own filters
              <ChevronRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>

            <h1 className="text-[32px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[44px] lg:text-[52px]">
              Plan, equip and fund your{" "}
              <span className="relative inline-block whitespace-nowrap">
                business.
                {/* Hand-drawn underline */}
                <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-brand sm:-bottom-3 sm:h-4">
                  <path d="M4 16 C 60 6, 140 4, 296 12" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                </svg>
              </span>
              <br className="hidden sm:block" />{" "}
              Everything you need, in one place.
            </h1>

            {/* Three things to know, as pills */}
            <ul className="flex flex-wrap justify-center gap-3">
              {HERO_PILLS.map(([icon, title, text, tone]) => (
                <li key={title} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] py-2.5 pl-2.5 pr-5 text-left ring-1 ring-white/10 backdrop-blur">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tone}`}><Icon name={icon} className="h-5 w-5" /></span>
                  <span className="flex flex-col">
                    <span className="font-display text-[15px] font-extrabold text-white">{title}</span>
                    <span className="text-[13px] text-white/60">{text}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* One big call to action, ringed in white */}
            <div className="mt-2 flex flex-col items-center gap-3">
              <span className="rounded-full bg-white/10 p-1.5 ring-1 ring-white/20">
                <Link href="/signup" className="group inline-flex h-14 items-center gap-3 rounded-full bg-brand pl-8 pr-2.5 font-display text-lg font-bold text-white transition hover:bg-brand-dark hover:text-white sm:pl-10">
                  Get started free
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 transition group-hover:translate-x-0.5"><Icon name="arrow" className="h-5 w-5" /></span>
                </Link>
              </span>
              <p className="text-sm text-white/70"><strong className="font-semibold text-white">Free account</strong> — previews of every page — pay with mobile money</p>
            </div>

            {/* Every service as a small chip, straight to its directory */}
            <ul aria-label="Our services" className="flex max-w-3xl flex-wrap justify-center gap-2">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group inline-flex items-center gap-1.5 rounded-full border border-dotted border-brand/70 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:-translate-y-0.5 hover:border-solid hover:border-brand hover:bg-brand hover:text-white">
                    <Icon name={d.icon} className="h-3.5 w-3.5 text-brand-mint group-hover:text-white" />
                    {d.nav}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Product preview: an app window rising from the bottom of the panel, built from real data */}
          <div className="rise-late relative mx-auto max-w-5xl px-4 sm:px-8">
            <div className="relative h-[300px] overflow-hidden rounded-t-2xl border border-b-0 border-white/15 bg-white/10 p-2 pb-0 backdrop-blur sm:h-[380px]">
              <div className="flex h-full overflow-hidden rounded-t-xl bg-white text-left text-ink">
                {/* Sidebar */}
                <div className="hidden w-52 shrink-0 flex-col gap-1 border-r border-line bg-page/60 p-3 md:flex">
                  <span className="mb-2 flex items-center gap-2 px-2 pt-1 font-display text-sm font-extrabold"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[11px] text-white">B</span>BizSphere</span>
                  {DIRECTORIES.slice(0, 7).map((d, n) => {
                    const c = d.type === "PRICES" ? priceCount : (counts.get(d.type) ?? 0);
                    return (
                      <span key={d.href} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs ${n === 0 ? "bg-brand font-semibold text-white" : "text-ink-soft"}`}>
                        <span className="flex items-center gap-2"><Icon name={d.icon} className="h-3.5 w-3.5" />{d.nav}</span>
                        <span className={n === 0 ? "text-white/80" : "text-ink-muted"}>{c}</span>
                      </span>
                    );
                  })}
                </div>
                {/* The plan */}
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="eyebrow">Business idea · {idea?.primaryCategory?.name ?? "Food production"}</span>
                      <p className="title truncate text-lg">{idea?.title ?? "Small bakery"}</p>
                    </div>
                    <span className="badge-info shrink-0">{scenario?.estimateDate ? `Est. ${date(scenario.estimateDate)}` : "Dated estimate"}</span>
                  </div>
                  <div className="rounded-xl border border-line">
                    <div className="border-b border-line px-3.5 py-2 text-xs font-bold text-ink-soft">Startup budget · standard</div>
                    {(scenario?.lines.slice(0, 4) ?? []).map((l) => (
                      <div key={l.id} className="flex justify-between gap-3 border-b border-line px-3.5 py-2 text-[13px] last:border-0">
                        <span className="truncate text-ink-soft">{l.description}</span>
                        <span className="whitespace-nowrap font-semibold">{l.unitCost === null ? <span className="font-normal text-ink-muted">Being sourced</span> : money(Number(l.unitCost) * Number(l.quantity), scenario?.currency)}</span>
                      </div>
                    ))}
                    {scenario ? (
                      <div className="flex justify-between gap-3 bg-page px-3.5 py-2 text-[13px] font-extrabold"><span>Total</span><span className="text-right">{(() => { const t = budgetTotal(scenario.lines); return t === null ? "When all lines are sourced" : money(t, scenario.currency); })()}</span></div>
                    ) : null}
                  </div>
                </div>
                {/* What it links to (only when the plan has links) */}
                <div className={`${idea?.relatedFrom.length ? "lg:flex" : ""} hidden w-60 shrink-0 flex-col gap-2 border-l border-line p-4`}>
                  <span className="text-xs font-bold text-ink-soft">Links to</span>
                  {(idea?.relatedFrom ?? []).slice(0, 5).map((r) => (
                    <span key={r.toItem.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 text-xs font-medium">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand"><Icon name={TYPE_ICON[r.toItem.contentType] ?? "link"} className="h-3.5 w-3.5" /></span>
                      <span className="truncate">{r.toItem.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="float-slow absolute -top-7 right-2 hidden items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-ink sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tint text-brand"><Icon name="shield" /></span>
              <span className="flex flex-col"><span className="text-sm font-extrabold">Business contact checked</span><span className="text-xs text-ink-muted">Every check shows its date</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Updates marquee (managed at /admin/updates) ── */}
      <UpdatesMarquee updates={updates} />

      {/* ── Directories ─────────────────────────────────── */}
      <section className="border-y border-line bg-white">
        <div className="container-site flex flex-col gap-8 py-14">
          <SectionHead eyebrow="Everything in one place" title="From idea to open doors" text="Every directory links to the others, so one search for “bakery” brings you the plan, the oven, the supplier and the loan." />
          <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIRECTORIES.map((d, n) => {
              const count = d.type === "PRICES" ? priceCount : (counts.get(d.type) ?? 0);
              return (
                <Link key={d.href} href={d.href} data-onboard={onboard} data-reveal style={{ "--d": `${(n % 3) * 90}ms` } as React.CSSProperties} className="group card flex flex-col p-5 text-ink transition hover:-translate-y-1 hover:border-brand/50 hover:text-ink">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand transition duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-brand group-hover:text-white"><Icon name={d.icon} /></span>
                    <span className={count ? "badge-ok" : "badge-muted"}>{count ? <><span data-count={count}>{count}</span>&nbsp;{d.unit[count === 1 ? 0 : 1]}</> : "Coming soon"}</span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-extrabold leading-snug tracking-tight text-ink group-hover:text-brand-dark">{d.title}</h3>
                  <span className="mb-4 mt-1.5 text-sm leading-relaxed text-ink-muted">{d.text}</span>
                  <span className="mt-auto flex items-center justify-between border-t border-line pt-3.5 text-sm font-semibold text-brand">
                    Open {d.short}
                    <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
            {/* 10 directories leave two slots on the last row: fill them with search */}
            <form action="/search" role="search" data-reveal style={{ "--d": "90ms" } as React.CSSProperties} className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-[#2B2B2B] p-6 text-white sm:col-span-2 lg:flex-row lg:items-center lg:gap-8 lg:p-8">
              <div className="relative flex flex-col gap-1.5 lg:max-w-xs">
                <span className="title text-lg">Not sure where to start?</span>
                <span className="text-sm leading-relaxed text-white/85">Search the whole site by business, product or place.</span>
              </div>
              <label className="relative flex items-center gap-2 rounded-xl bg-white p-1.5 pl-3 text-ink-muted lg:flex-1">
                <Icon name="search" className="h-5 w-5 shrink-0" />
                <span className="sr-only">Search all directories</span>
                <input name="q" type="search" placeholder="e.g. maize mill" className="min-h-[42px] w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted" />
                <button className="btn-primary min-h-[42px] shrink-0 rounded-lg px-4">Search</button>
              </label>
            </form>
          </div>
          </OnboardingGate>

          {/* The promise above, shown with a real listing and what it links to */}
          {idea && idea.relatedFrom.length ? (
            <div data-reveal className="flex flex-col gap-4 rounded-2xl border border-dashed border-brand/40 bg-brand-tint/60 p-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex shrink-0 flex-col gap-0.5">
                <span className="eyebrow">See it in action</span>
                <Link href={itemHref(idea)} className="title text-base text-ink hover:text-brand">{idea.title} links to</Link>
              </div>
              <ul className="flex flex-wrap gap-2">
                {idea.relatedFrom.map((r, n) => (
                  <li key={r.toItem.id} data-reveal style={{ "--d": `${150 + n * 70}ms` } as React.CSSProperties}>
                    <Link href={itemHref(r.toItem)} className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-2 pr-3.5 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-brand">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-tint text-brand"><Icon name={TYPE_ICON[r.toItem.contentType] ?? "link"} className="h-3.5 w-3.5" /></span>
                      {r.toItem.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Resources ───────────────────────────────────── */}
      {guides.length ? (
        <section className="py-14">
          <div className="container-site flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHead eyebrow="Resources" title="Guides, tools and news" text="Recently reviewed by our editors. Every page shows when it was last checked." />
              <Link href="/guides" className="group inline-flex items-center gap-1 text-sm font-semibold">All resources <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {guides.slice(0, 4).map((g, n) => (
                <Link key={g.id} href={itemHref(g)} data-reveal style={{ "--d": `${n * 90}ms` } as React.CSSProperties} className="group card flex flex-col gap-3 p-5 text-ink transition hover:-translate-y-1 hover:border-brand/50 hover:text-ink">
                  <span className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-tint text-brand transition group-hover:bg-brand group-hover:text-white"><Icon name={TYPE_ICON[g.contentType] ?? "guide"} className="h-4 w-4" /></span>
                    <span className="eyebrow">{contentTypeLabel[g.contentType]}</span>
                  </span>
                  <span className="font-display text-base font-bold leading-snug group-hover:text-brand">{g.title}</span>
                  <span className="mt-auto flex items-center gap-1.5 border-t border-line pt-3 text-xs text-ink-muted">
                    <Icon name="calendar" className="h-3.5 w-3.5" /> Reviewed {date(g.lastReviewedAt)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="border-y border-line bg-white">
        <div className="container-site grid gap-8 py-14 lg:grid-cols-[1fr_1.6fr]">
          <div data-reveal className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <SectionHead eyebrow="FAQ" title="Questions people ask" />
            <div className="card flex items-center gap-4 bg-gradient-to-br from-brand-tint to-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/coffee.gif" alt="" loading="lazy" width={96} height={72} className="h-[72px] w-auto shrink-0 mix-blend-multiply" />
              <div className="flex flex-col gap-1.5">
                <span className="title text-[15px]">Can&apos;t find your answer?</span>
                <span className="text-sm leading-relaxed text-ink-muted">Send us your question from the contact page.</span>
                <Link href="/contact" className="mt-0.5 text-sm font-semibold">Contact us →</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map(([q, a], n) => (
              <details key={q} open={n === 0} data-reveal style={{ "--d": `${n * 70}ms` } as React.CSSProperties} className="group card p-5 transition open:border-brand/40 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[15px] font-bold">
                  {q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-lg transition duration-300 group-open:rotate-45 group-open:bg-brand group-open:text-white">+</span>
                </summary>
                <p className="pt-3 text-[15px] leading-relaxed text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="container-site py-14">
        <div data-reveal className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-ink via-[#1C1C1C] to-[#2B2B2B] px-8 py-10 text-white md:px-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/sprinting.gif" alt="" loading="lazy" width={160} height={120} className="hidden h-28 w-auto shrink-0 rounded-2xl bg-white/95 p-2 md:block" />
              <div className="flex max-w-2xl flex-col gap-3">
                <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Your business starts with the right information</h2>
                <p className="text-[15px] text-white/90">Create a free account in a minute. Upgrade when you&apos;re ready to act.</p>
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-white/90">
                  {["Free account", "No card needed", "Pay later with mobile money"].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5"><Icon name="check" className="h-4 w-4" />{t}</span>
                  ))}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/signup" className="btn group min-h-[46px] rounded-full bg-white px-6 font-bold text-brand hover:bg-brand-tint hover:text-brand">Get started free <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
              <Link href="/business-ideas" className="btn min-h-[46px] rounded-full border border-white/50 px-6 text-white hover:bg-white/10 hover:text-white">Browse ideas</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, text, center = false }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <div data-reveal className={`flex max-w-2xl flex-col gap-2 ${center ? "mx-auto items-center text-center" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      {text ? <p className="text-[15px] leading-relaxed text-ink-muted sm:text-base">{text}</p> : null}
    </div>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DIRECTORIES } from "@/config/directories";
import { contentTypeLabel, date, itemHref, money } from "@/lib/format";
import { homeVideo } from "@/lib/youtube";
import { Icon } from "@/components/Icon";
import { YouTubePlayer } from "@/components/YouTubePlayer";
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


const FAQ: [string, string][] = [
  ["Is BizSphere-Ug free to use?", "Yes. You can search everything and read a preview of every page for free. A membership unlocks full budgets, contacts, funding terms, price history and downloads."],
  ["Where does the information come from?", "From official sources, supplier quotations, market visits and providers' published terms. Each page lists its sources and the date it was last reviewed."],
  ["What does “checked” mean on a supplier?", "We say exactly what we checked and when, for example “Business contact checked on 12 March”. A checked contact doesn't guarantee product quality, so always confirm terms before you pay."],
  ["How do I pay for membership?", "With MTN Mobile Money, Airtel Money or a card. You can cancel any time from your account."],
  ["I run a business. Can I be listed?", "Yes. Contact our team with your business details. We add every listing ourselves and check it before it goes live."],
];

export default async function HomePage() {
  const [viewer, memberPlan, idea, guides, updates, typeCounts, priceCount, yt] = await Promise.all([
    getViewer(),
    prisma.membershipPlan.findUnique({ where: { code: "member" } }),
    prisma.contentItem.findFirst({
      where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED" },
      include: {
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
    homeVideo(),
  ]);
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
            <Link href="/search" className="group inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm text-white border border-white/15 transition hover:bg-white/15 hover:text-white">
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

            {/* One big call to action, ringed in white */}
            <div className="mt-2 flex flex-col items-center gap-3">
              <span>
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

          {/* Watch us: the live stream while we're live on YouTube, otherwise the latest video (set at /admin/video) */}
          <div id="watch" className="rise-late relative mx-auto w-full max-w-4xl scroll-mt-24 px-4 pb-6 sm:px-8 sm:pb-10">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-2">
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2.5 pt-1">
                <span className="flex min-w-0 items-center gap-2.5 text-left">
                  {yt.video?.live ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#FF0033] px-2 py-0.5 font-display text-[11px] font-extrabold tracking-wider text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 font-display text-[11px] font-extrabold tracking-wider text-white/80"><Icon name="video" className="h-3.5 w-3.5" />{yt.video ? "LATEST VIDEO" : "VIDEOS"}</span>
                  )}
                  <span className="truncate text-sm font-semibold text-white">{yt.video?.live ? (yt.video.title ?? "We're live on YouTube") : (yt.video?.title ?? "Watch BizSphere-Ug")}</span>
                </span>
                {yt.channelId ? (
                  <a href={`https://www.youtube.com/channel/${yt.channelId}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 font-display text-xs font-bold text-ink transition hover:bg-brand hover:text-white">
                    <Icon name="video" className="h-3.5 w-3.5" /> Subscribe on YouTube
                  </a>
                ) : null}
              </div>
              <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                {yt.video ? (
                  <YouTubePlayer id={yt.video.id} title={yt.video.title ?? "BizSphere-Ug on YouTube"} live={yt.video.live} />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-white/25 text-white/50"><Icon name="video" className="h-7 w-7" /></span>
                    <p className="font-display text-lg font-bold text-white">Live sessions and videos are coming</p>
                    <p className="max-w-sm text-sm text-white/60">When we go live on YouTube, you can watch right here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Updates marquee (managed at /admin/updates) ── */}
      <UpdatesMarquee updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />

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
                  {/* Inter, not Manrope: Manrope tops out at 800; Inter goes to 900 (black) */}
                  <h3 className="mt-4 font-sans text-2xl font-black leading-tight tracking-tight text-ink group-hover:text-brand-dark">{d.title}</h3>
                  <span className="mb-4 mt-1.5 text-sm leading-relaxed text-ink-muted">{d.text}</span>
                  <span className="mt-auto flex items-center justify-between border-t border-line pt-3.5 text-sm font-bold text-brand">
                    Open {d.short}
                    <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
            {/* 10 directories leave two slots on the last row: fill them with search */}
            <form action="/search" role="search" data-reveal style={{ "--d": "90ms" } as React.CSSProperties} className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-2xl bg-ink p-6 text-white sm:col-span-2 lg:flex-row lg:items-center lg:gap-8 lg:p-8">
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
            <div className="card flex items-center gap-4 bg-brand-tint p-4">
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
        <div data-reveal className="relative overflow-hidden rounded-[28px] bg-ink px-8 py-10 text-white md:px-12">
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

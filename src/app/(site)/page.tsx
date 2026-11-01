import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cachedHomeStats, cachedRecentGuides, cachedSiteUpdates } from "@/lib/cached";
import { DIRECTORIES } from "@/config/directories";
import { contentTypeLabel, date, itemHref } from "@/lib/format";
import { homeVideo } from "@/lib/youtube";
import { Icon } from "@/components/Icon";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { HomeSearch } from "@/components/HomeSearch";
import { RecentStrip } from "@/components/Recent";
import { getViewer } from "@/lib/access";
import { BadgeCheck, BarChart3, Check, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Homepage. Every record shown comes from the database or is a true product fact.
 * No invented customer logos, testimonials or user counts.
 */

const TYPE_ICON: Record<string, string> = { GUIDE: "guide", TOOL: "tool", NEWS: "news", RECIPE: "recipe" };

const FAQ: [string, string][] = [
  ["Is BizSphere-Ug free to use?", "Yes. You can search everything and read a preview of every page for free. A membership unlocks full budgets, contacts, funding terms, price history and downloads."],
  ["Where does the information come from?", "From official sources, supplier quotations, market visits and providers' published terms. Each page lists its sources and the date it was last reviewed."],
  ["What does “checked” mean on a supplier?", "We say exactly what we checked and when, for example “Business contact checked on 12 March”. A checked contact doesn't guarantee product quality, so always confirm terms before you pay."],
  ["How do I pay for membership?", "With MTN Mobile Money, Airtel Money or a card. You can cancel any time from your account."],
  ["I run a business. Can I be listed?", "Yes. Contact our team with your business details. We add every listing ourselves and check it before it goes live."],
  ["Do I need an account to search?", "No. Anyone can search every directory and use its filters. An account lets you save pages and come back to them."],
  ["What does a membership unlock?", "Full start-up budgets and every step of each business plan, supplier and expert contacts, machine prices, funding amounts and terms, price history and downloads."],
  ["Can I cancel my membership?", "Yes, any time from your account. You keep access until the end of the period you paid for."],
  ["How current are the market prices?", "Every price shows the date it was observed, the market and the unit. Old observations are kept as history rather than overwritten."],
  ["Are the start-up budgets exact?", "They are dated estimates, built line by line with their assumptions shown. Prices change, so confirm quotes with suppliers before you commit money."],
  ["Does a listing guarantee funding or quality?", "No. Funding amounts are the provider's ranges, not a promise you will receive them, and a checked supplier contact is not a guarantee of product quality."],
  ["I found a mistake. What should I do?", "Use “Report a correction” on the page. An editor reviews every report and updates the page if the information has changed."],
  ["Does it work on my phone?", "Yes. Every page, search and payment works on a phone, and you can pay with MTN Mobile Money or Airtel Money."],
];

export default async function HomePage() {
  const [viewer, guides, updates, yt, stats] = await Promise.all([
    getViewer(),
    cachedRecentGuides(),
    cachedSiteUpdates(),
    homeVideo(),
    cachedHomeStats(),
  ]);
  const [lead, ...more] = guides;

  return (
    <>
      {/* ── Hero: flat navy, no glows. The floating header sits on it (.under-header).
          Left: a trust line, the headline, one sentence, search, popular directories, two actions and
          what people worry about before paying (free search, mobile money, cancel any time).
          Right (wide screens): the "How it works" card. ── */}
      <section className="under-header relative isolate overflow-hidden bg-[#071A33] text-white">
        {/* Flat decoration: thin rings spreading from the top-right corner, a blue arc and an orange dot
            riding on them. Solid lines only, no glow; hidden on phones, where it would sit on the headline. */}
        <svg aria-hidden viewBox="0 0 600 600" fill="none" className="pointer-events-none absolute -right-48 -top-24 -z-10 hidden h-[520px] w-[520px] sm:block sm:-right-32 sm:h-[720px] sm:w-[720px] sm:opacity-100 xl:-right-16 xl:-top-10 xl:h-[860px] xl:w-[860px]">
          {[90, 160, 230, 300].map((r) => <circle key={r} cx="420" cy="180" r={r} stroke="white" strokeOpacity="0.07" strokeWidth="1.5" />)}
          <path d="M 420 -50 A 230 230 0 0 1 650 180" stroke="#157EC2" strokeWidth="6" strokeLinecap="round" />
          <path d="M 120 180 A 300 300 0 0 1 207 -32" stroke="#F28C28" strokeOpacity="0.9" strokeWidth="4" strokeLinecap="round" />
          <circle cx="257" cy="255" r="11" fill="#F28C28" />
          <circle cx="510" cy="330" r="6" fill="white" fillOpacity="0.5" />
        </svg>

        <div className="container-site relative grid items-center gap-12 pb-16 pt-12 sm:pb-24 sm:pt-20 xl:grid-cols-[1.15fr_1fr] xl:gap-16 2xl:gap-20">
          <div className="hero-rise flex flex-col items-start gap-5 sm:gap-6">
            <Link href="/methodology" className="group inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1 pl-1 pr-3 text-[13px] font-medium text-white/85 transition hover:border-white/40 hover:text-white">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#12B76A] text-white"><BadgeCheck aria-hidden className="h-3.5 w-3.5" /></span>
              <span className="truncate">Every page checked by our team{stats.lastChecked ? ` · latest ${date(stats.lastChecked)}` : ""}</span>
              <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5" />
            </Link>
            {/* Headline is the blueprint's search prompt (Design Blueprint, section 15). Manrope ExtraBold. Words rise in one by one;
                "start" in orange. From laptop width it breaks after "to", as in the design. */}
            <h1 className="font-hero text-[34px] font-extrabold leading-[1.06] tracking-[-0.03em] text-white sm:text-[44px] xl:text-[50px] 2xl:text-[56px]">
              {["What", "do", "you", "want", "to", "start,", "find", "or", "solve?"].map((w, n) => (
                <span key={w} className="contents">
                  <span className="word-in inline-block" style={{ animationDelay: `${n * 70}ms` }}>
                    {w === "start," ? <><span className="text-accent">start</span>,</> : w}
                  </span>
                  {n === 4 ? <br className="hidden xl:block" /> : null}{n < 8 ? " " : ""}
                </span>
              ))}
            </h1>

            <p className="max-w-xl text-[15px] leading-relaxed text-white/75 sm:text-[17px]">
              Real start-up budgets, machine prices, checked suppliers and funding for Uganda. In one place, dated and sourced.
            </p>

            <HomeSearch />

            {/* Every directory as a chip, right under the search */}
            <ul aria-label="Directories" className="flex max-w-[720px] flex-wrap gap-2.5">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group inline-flex h-12 items-center gap-2.5 rounded-xl border-2 border-dotted border-white/45 bg-white/[0.04] px-4 text-[16px] font-semibold text-white/90 transition-colors hover:border-solid hover:border-accent hover:bg-accent hover:text-ink sm:h-[52px] sm:px-5 sm:text-[17px]">
                    <Icon name={d.icon} className="h-5 w-5 text-accent group-hover:text-ink" />
                    {d.nav}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-3">
                <Link href="/signup" className="group inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-accent px-6 text-[16px] font-bold text-ink transition-colors hover:bg-white hover:text-ink">Get started free<ChevronRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
                <Link href="/business-ideas" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 px-6 text-[16px] font-semibold text-white transition-colors hover:border-white/60 hover:bg-white/10 hover:text-white">Browse business ideas</Link>
              </div>
              {/* What stops people paying, answered before they ask */}
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-white/70">
                {["Free to search", "Pay with MTN MoMo or Airtel Money", "Cancel any time"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5"><Check aria-hidden className="h-3.5 w-3.5 text-[#12B76A]" strokeWidth={3} />{t}</li>
                ))}
              </ul>
            </div>

          </div>

          {/* How it works: the live stream while we're live on YouTube, otherwise the latest video (set at
              /admin/video), otherwise the bakery example. Wide screens only (1280px+): narrower, it pushed the directories down. */}
          <div id="watch" className="rise-late hidden scroll-mt-28 flex-col items-center gap-6 xl:flex">
            <div className="w-full max-w-[560px] rounded-[20px] border border-white/15 bg-white p-4 text-ink">
              <div className="flex items-center gap-3 pb-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Icon name="video" className="h-4 w-4" /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-display text-[15px] font-bold leading-tight tracking-[-0.01em] text-heading">
                    {yt.video?.live ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#FF0033] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
                    ) : null}
                    <span className="truncate">{yt.video?.live ? (yt.video.title ?? "We're live on YouTube") : (yt.video?.title ?? "How Bizsphere-Ug works")}</span>
                  </span>
                  <span className="text-[12px] text-ink-muted">See how we help you from idea to action.</span>
                </span>
                {yt.channelId ? (
                  <a href={`https://www.youtube.com/channel/${yt.channelId}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-tint px-3 py-1.5 text-[13px] font-semibold text-brand hover:bg-brand hover:text-white">
                    <Icon name="video" className="h-4 w-4" />{yt.video ? "Subscribe" : "Watch on YouTube"}
                  </a>
                ) : null}
              </div>
              {yt.video ? (
                <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                  <YouTubePlayer id={yt.video.id} title={yt.video.title ?? "Bizsphere-Ug on YouTube"} live={yt.video.live} />
                </div>
              ) : (
                <Showcase />
              )}
            </div>

            {/* Status pill under the card */}
            <div className="flex w-full max-w-[520px] items-center gap-3 rounded-xl border border-white/20 bg-white/[0.07] px-4 py-2.5 text-[13px] text-white/80 backdrop-blur">
              <span aria-hidden className="flex gap-1">
                {[0, 200, 400].map((d) => <span key={d} className="live-dot h-1.5 w-1.5 rounded-full bg-white" style={{ animationDelay: `${d}ms` }} />)}
              </span>
              Linking the plan to machines, suppliers and funding…
            </div>
          </div>
        </div>

      </section>

      {/* ── Updates marquee (managed at /admin/updates) ── */}
      <UpdatesMarquee updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />

      {/* ── Directories ─────────────────────────────────── */}
      <section id="directories" className="scroll-mt-24 bg-white">
        <div className="container-site flex flex-col gap-8 py-14 sm:gap-10 sm:py-20 lg:py-24">
          {/* Returning visitors: what they opened last time, first. Empty on a first visit. */}
          <RecentStrip title="Welcome back · pick up where you left off" className="-mt-6 sm:-mt-10" />
          <Heading eyebrow="Directories" title={<>What you&apos;ll <span className="text-brand">find here</span></>}
            text="The directories link to each other. Look up “bakery” and you get the plan, the oven, who sells flour and who lends." />

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 rounded-2xl border border-line bg-white p-5 text-ink transition-colors hover:border-brand hover:text-ink sm:flex sm:flex-col sm:p-7">
                <span className="row-span-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-12 sm:w-12"><Icon name={d.icon} className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} /></span>
                <h3 className="font-display text-[17px] font-extrabold sm:mt-5 sm:text-[19px] leading-tight tracking-[-0.025em] text-heading">{d.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted sm:mb-5 sm:mt-2.5 sm:line-clamp-3 sm:text-sm">{d.text}</p>
                <span className="mt-2 text-sm font-semibold text-brand sm:mt-auto sm:text-[15px] group-hover:underline group-hover:underline-offset-4">Explore {d.short} →</span>
              </Link>
            ))}
            {/* 10 directories in rows of four leave two slots on the last row: fill them with search */}
            <form action="/search" role="search" className="flex flex-col justify-center gap-4 rounded-xl bg-brand-deep p-6 text-white sm:col-span-2 sm:p-8">
              <div className="flex flex-col gap-1">
                <span className="font-display text-[24px] font-bold tracking-[-0.02em]">Looking for something specific?</span>
                <span className="text-[15px] leading-relaxed text-white/75">Search by business, product or town.</span>
              </div>
              <label className="flex items-center gap-2 rounded-lg bg-white p-1.5 pl-3 text-ink-muted">
                <Icon name="search" className="h-4 w-4 shrink-0" />
                <span className="sr-only">Search all directories</span>
                <input name="q" type="search" placeholder="e.g. maize mill" className="min-h-[48px] w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted" />
                <button className="btn min-h-[44px] shrink-0 bg-accent px-4 text-ink hover:bg-accent/90 hover:text-ink">Search</button>
              </label>
            </form>
          </div>
        </div>
      </section>


      {/* ── Recently reviewed: bento on navy, so it stands apart from the white directories above and the
          light FAQ below. The newest guide as a large blue card, four more as outlined dark cards. ── */}
      {/* Members only: visitors and signed-in non-payers don't see this section at all */}
      {lead && viewer.isMember ? (
        <section className="relative isolate overflow-hidden bg-[#071A33] text-white">
          {/* Same flat rings as the hero, from the opposite corner */}
          <svg aria-hidden viewBox="0 0 600 600" fill="none" className="pointer-events-none absolute -bottom-64 -left-56 -z-10 h-[640px] w-[640px]">
            {[90, 160, 230, 300].map((r) => <circle key={r} cx="300" cy="300" r={r} stroke="white" strokeOpacity="0.06" strokeWidth="1.5" />)}
            <path d="M 300 70 A 230 230 0 0 1 530 300" stroke="#F28C28" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <div className="container-site flex flex-col gap-8 py-14 sm:gap-10 sm:py-20 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-2xl flex-col gap-3">
                <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent">Resources</span>
                <h2 className="text-section-title text-white">Recently reviewed</h2>
                <p className="text-[15px] leading-relaxed text-white/70 sm:text-base">Guides, tools and news our editors have checked lately. Every page shows the date.</p>
              </div>
              <Link href="/guides" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/25 px-5 text-[15px] font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-ink">All guides <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-4 lg:grid-rows-2">
              {/* Newest */}
              <Link href={itemHref(lead)} className="group relative isolate flex min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl bg-brand p-7 text-white hover:text-white lg:col-span-2 lg:row-span-2 lg:p-9">
                <Icon name={TYPE_ICON[lead.contentType] ?? "guide"} className="absolute -bottom-10 -right-8 -z-10 h-56 w-56 text-white/10" strokeWidth={1.25} />
                <span className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-heading">{contentTypeLabel[lead.contentType]}</span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">Reviewed {date(lead.lastReviewedAt ?? lead.publishedAt)}</span>
                </span>
                <span className="flex max-w-lg flex-col gap-4">
                  <span className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[36px]">{lead.title}</span>
                  {lead.shortSummary ? <span className="line-clamp-3 text-[15px] leading-relaxed text-white/90 sm:text-base">{lead.shortSummary}</span> : null}
                  <span className="inline-flex w-fit items-center gap-2 rounded-[10px] bg-white px-4 py-2.5 text-sm font-semibold text-heading transition group-hover:bg-accent group-hover:text-ink">
                    Read the guide <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>

              {/* Four more */}
              {more.slice(0, 4).map((g) => (
                <Link key={g.id} href={itemHref(g)} className="group flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-6 text-white transition-colors hover:border-accent hover:bg-white/[0.08] hover:text-white">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-accent transition-colors group-hover:bg-accent group-hover:text-ink"><Icon name={TYPE_ICON[g.contentType] ?? "guide"} className="h-5 w-5" /></span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">{date(g.lastReviewedAt ?? g.publishedAt)}</span>
                  </span>
                  <span className="flex flex-1 flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent">{contentTypeLabel[g.contentType]}</span>
                    <span className="font-display text-[19px] font-bold leading-tight tracking-[-0.01em] text-white">{g.title}</span>
                  </span>
                  <span className="flex items-center justify-between border-t border-white/10 pt-3 text-[15px] font-semibold text-white">
                    Read
                    <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white transition group-hover:border-accent group-hover:bg-accent group-hover:text-ink">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── FAQ: sticky intro with a contact card on the left; a numbered list that opens on the right ── */}
      <section className="border-t border-line bg-gradient-to-br from-[#EEF6FF] via-[#F6FAFF] to-[#FFF4E8]">
        <div className="container-site grid gap-8 py-14 sm:gap-10 sm:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:gap-16 lg:py-24">
          <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
            <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-accent-dark">FAQ</span>
            <h2 className="text-section-title text-heading">Questions, answered</h2>
            <p className="text-[15px] leading-relaxed text-ink-muted sm:text-base">Short answers about access, sources, prices and payment.</p>
            <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-white bg-white/80 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/illustrations/coffee.gif" alt="" loading="lazy" width={96} height={72} className="h-14 w-auto shrink-0 mix-blend-multiply" />
                <span className="flex flex-col">
                  <span className="font-display text-[18px] font-bold text-heading">Still have a question?</span>
                  <span className="text-[15px] text-ink-muted">Our team replies to every message.</span>
                </span>
              </div>
              <Link href="/contact" className="btn-primary min-h-[44px]">Contact us <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>
          </div>

          {/* Each question is a card like the rest of the site: blue number tile, bold title,
              orange toggle when open, light blue tint on the open card. */}
          <div className="flex flex-col gap-2">
            {FAQ.map(([q, a], n) => (
              <details key={q} open={n === 0} className="group rounded-xl border border-white bg-white/90 px-4 transition-colors hover:border-brand/40 open:border-brand/40 open:bg-white sm:px-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-4 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint font-display text-[12px] font-bold text-brand transition-colors group-open:bg-brand group-open:text-white">{String(n + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-display text-[15px] font-semibold leading-snug text-heading">{q}</span>
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand/30 text-lg font-medium leading-none text-brand transition group-open:rotate-45 group-open:border-accent group-open:bg-accent group-open:text-ink">+</span>
                </summary>
                <p className="pb-5 pl-[48px] pr-2 text-base leading-relaxed text-ink-soft sm:pr-12">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/** Section heading: dark title, optional one-line intro. */
function Heading({ eyebrow, title, text }: { eyebrow?: string; title: React.ReactNode; text?: string }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-dotted border-brand/40 bg-brand-tint px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />{eyebrow}
        </span>
      ) : null}
      <h2 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.04em] text-heading sm:text-[44px] lg:text-[52px]">{title}</h2>
      {text ? <p className="max-w-2xl text-[16px] leading-relaxed text-ink-muted sm:text-[18px]">{text}</p> : null}
    </div>
  );
}

/**
 * Shown in the hero's window while there is no video: one idea and the machine, supplier and
 * funding it links to, as small example cards. Illustrative only (marked "Example"); no real records.
 */
function Showcase() {
  // Each linked record with its own colour, as in the design: machines orange, suppliers green, funding purple.
  const linked: [string, string, string, string, string, string][] = [
    ["/machines", "machine", "Deck oven", "Machine", "Price for members", "bg-accent-tint text-accent-dark"],
    ["/suppliers", "supplier", "Flour wholesaler", "Supplier", "Contact checked", "bg-[#E3F6EC] text-[#12805C]"],
    ["/funding", "funding", "SME loan", "Funding source", "Round open", "bg-[#EFEBFF] text-[#6B4EE6]"],
  ];
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-[#EEF5FD] via-[#F7FAFE] to-[#FFF6EE] p-3 xl:p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-heading">Example: starting a bakery</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-ink-muted"><BarChart3 aria-hidden className="h-3.5 w-3.5 text-brand" />Live sessions coming soon</span>
      </div>
      <div className="grid grid-cols-[1.1fr_1fr] gap-2.5 2xl:gap-3">
        {/* The plan */}
        <div className="flex flex-col gap-2.5 rounded-2xl bg-white p-3.5 xl:p-4">
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white"><Icon name="idea" className="h-3.5 w-3.5" /></span>
            <span className="whitespace-nowrap rounded-md bg-brand-tint px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark">Business plan</span>
            <ChevronRight aria-hidden className="ml-auto h-4 w-4 text-ink-muted" />
          </span>
          <span className="font-display text-[15px] font-semibold leading-tight tracking-[-0.01em] text-heading">Bakery business</span>
          <span className="flex-1 text-[12px] leading-relaxed text-ink-muted">Budget, steps, staff and risks.</span>
          <span className="flex flex-wrap gap-1.5">
            {["Small", "Medium", "Large"].map((l) => <span key={l} className="rounded-md bg-page px-2 py-0.5 text-[11px] font-medium text-ink-soft">{l}</span>)}
          </span>
        </div>
        {/* What it links to */}
        <div className="flex flex-col gap-2.5">
          {linked.map(([href, icon, name, kind, note, tone]) => (
            <Link key={kind} href={href} className="group flex flex-1 items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-ink hover:text-ink">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon name={icon} className="h-4 w-4" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-display text-[13px] font-bold leading-tight text-heading">{name}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-ink-muted">{kind}</span>
                  <span className={`rounded px-1.5 py-px text-[10px] font-semibold ${tone}`}>{note}</span>
                </span>
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cachedRecentGuides, cachedSiteUpdates } from "@/lib/cached";
import { DIRECTORIES } from "@/config/directories";
import { contentTypeLabel, date, itemHref } from "@/lib/format";
import { homeVideo } from "@/lib/youtube";
import { Icon } from "@/components/Icon";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { getViewer } from "@/lib/access";
import { BarChart3, ChevronRight } from "lucide-react";

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
  const [viewer, guides, updates, yt] = await Promise.all([
    getViewer(),
    cachedRecentGuides(),
    cachedSiteUpdates(),
    homeVideo(),
  ]);
  const [lead, ...more] = guides;

  return (
    <>
      {/* ── Hero: deep navy with a dotted corner, curved blue light from the right and a teal glow bottom-right.
          Headline (64px / 800 on wide screens), paragraph, search, directory chips and actions on the left; the
          "How it works" card on the right (wide screens). ── */}
      <section className="relative isolate overflow-hidden bg-[#071A33] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_85%_at_100%_100%,#22C7CF_0%,#1E7FDB_38%,rgba(7,26,51,0)_75%)]" />
        <div aria-hidden className="pointer-events-none absolute -right-[20%] -top-[30%] -z-10 h-[120%] w-[70%] rounded-full bg-[radial-gradient(closest-side,rgba(30,127,219,0.35),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute left-4 top-6 -z-10 hidden h-28 w-40 bg-[radial-gradient(rgba(255,255,255,0.22)_1.5px,transparent_1.5px)] [background-size:16px_16px] lg:block" />

        <div className="container-site relative grid items-center gap-12 pb-10 pt-10 sm:pt-14 lg:pb-10 lg:pt-14 xl:grid-cols-[1.1fr_1fr] xl:gap-12 2xl:gap-16">
          <div className="hero-rise flex flex-col items-start gap-6">
            {/* Headline is the blueprint's search prompt (Design Blueprint, section 15). Words blur in one by one;
                "start" in orange. From laptop width it breaks after "to", as in the design. */}
            <h1 className="font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.04em] text-white sm:text-[48px] lg:text-[44px] xl:text-[52px] 2xl:text-[64px]">
              {["What", "do", "you", "want", "to", "start,", "find", "or", "solve?"].map((w, n) => (
                <span key={w} className="contents">
                  <span className="word-in inline-block" style={{ animationDelay: `${n * 90}ms` }}>
                    {w === "start," ? <><span className="text-accent">start</span>,</> : w}
                  </span>
                  {n === 4 ? <br className="hidden xl:block" /> : null}{n < 8 ? " " : ""}
                </span>
              ))}
            </h1>

            <p className="max-w-2xl text-[17px] leading-[1.55] text-white/85 sm:text-xl 2xl:text-[24px]">
              Pick a business idea, see its dated start-up budget, find the machines and suppliers to equip it, check funding that fits, and save everything you need to act.
            </p>

            <form action="/search" role="search" className="flex w-full max-w-[720px] items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 text-ink-muted ring-4 ring-white/10 sm:p-2 sm:pl-6">
              <Icon name="search" className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
              <label className="sr-only" htmlFor="hero-q">Search all directories</label>
              <input id="hero-q" name="q" type="search" enterKeyHint="search" placeholder="Try “start a bakery”" className="min-h-[48px] w-full min-w-0 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-muted sm:min-h-[60px] sm:text-[20px]" />
              <button className="btn-primary min-h-[48px] shrink-0 rounded-xl px-5 text-base font-semibold sm:min-h-[60px] sm:px-9 sm:text-[20px]">Search</button>
            </form>

            {/* Every directory as a chip */}
            <ul aria-label="Directories" className="-mt-1 flex max-w-[780px] flex-wrap gap-2">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/[0.04] px-3 py-2 text-[14px] font-medium text-white transition-colors hover:border-accent hover:bg-accent hover:text-ink sm:px-3.5 sm:text-[15px] 2xl:py-2.5 2xl:text-base">
                    <Icon name={d.icon} className="h-4 w-4 text-white group-hover:text-ink sm:h-[18px] sm:w-[18px]" />
                    {d.nav}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-1 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
              <Link href="/signup" className="inline-flex min-h-[54px] items-center justify-center rounded-lg bg-accent px-8 text-[17px] font-semibold text-ink transition-colors hover:bg-white hover:text-ink 2xl:text-[18px]">Get started now</Link>
              <Link href="/search" className="inline-flex min-h-[54px] items-center justify-center rounded-lg border border-white/80 px-8 text-[17px] 2xl:text-[18px] font-semibold text-white transition-colors hover:bg-white/10 hover:text-white">Search directories</Link>
            </div>
          </div>

          {/* How it works: the live stream while we're live on YouTube, otherwise the latest video (set at
              /admin/video), otherwise the bakery example. Wide screens only (1280px+): narrower, it pushed the directories down. */}
          <div id="watch" className="rise-late hidden scroll-mt-28 flex-col items-center gap-6 xl:flex">
            <div className="w-full max-w-[700px] rounded-[22px] bg-white p-5 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] xl:p-6">
              <div className="flex items-center gap-4 pb-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Icon name="video" className="h-6 w-6" /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-display text-[20px] font-bold leading-tight tracking-[-0.01em] text-heading xl:text-[22px]">
                    {yt.video?.live ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#FF0033] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
                    ) : null}
                    <span className="truncate">{yt.video?.live ? (yt.video.title ?? "We're live on YouTube") : (yt.video?.title ?? "How Bizsphere-Ug works")}</span>
                  </span>
                  <span className="text-[15px] text-ink-muted">See how we help you from idea to action.</span>
                </span>
                {yt.channelId ? (
                  <a href={`https://www.youtube.com/channel/${yt.channelId}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-tint px-4 py-2.5 text-[15px] font-semibold text-brand hover:bg-brand hover:text-white">
                    <Icon name="video" className="h-[18px] w-[18px]" />{yt.video ? "Subscribe" : "Watch on YouTube"}
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
            <div className="flex w-full max-w-[640px] items-center gap-3 rounded-2xl border border-white/40 bg-white/10 px-6 py-4 text-[16px] italic text-white backdrop-blur">
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
      <section className="bg-white">
        <div className="container-site flex flex-col gap-8 py-14 sm:gap-10 sm:py-20 lg:py-24">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <Heading title="What you'll find here" />
            <p className="max-w-md text-[15px] leading-relaxed text-ink-muted sm:text-base lg:text-right">
              The directories link to each other. Look up “bakery” and you get the plan, the oven, who sells flour and who lends.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 rounded-2xl border border-line bg-white p-5 text-ink transition-colors hover:border-brand hover:text-ink sm:flex sm:flex-col sm:p-7">
                <span className="row-span-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-12 sm:w-12"><Icon name={d.icon} className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} /></span>
                <h3 className="font-display text-[17px] font-bold sm:mt-5 sm:text-[18px] leading-tight tracking-[-0.02em] text-heading">{d.title}</h3>
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


      {/* ── Recently reviewed: bento. The newest guide as a large blue card, four more around it. ── */}
      {/* Members only: visitors and signed-in non-payers don't see this section at all */}
      {lead && viewer.isMember ? (
        <section className="bg-white">
          <div className="container-site flex flex-col gap-8 py-14 sm:gap-10 sm:py-20 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-2xl flex-col gap-3">
                <span className="w-fit rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-dark">Resources</span>
                <h2 className="text-section-title text-heading">Recently reviewed</h2>
                <p className="text-[15px] leading-relaxed text-ink-muted sm:text-base">Guides, tools and news our editors have checked lately. Every page shows the date.</p>
              </div>
              <Link href="/guides" className="btn-outline min-h-[44px]">All guides <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-4 lg:grid-rows-2">
              {/* Newest */}
              <Link href={itemHref(lead)} className="group relative isolate flex min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl bg-brand p-7 text-white hover:text-white lg:col-span-2 lg:row-span-2 lg:p-9">
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_100%_0%,rgba(255,255,255,0.25),transparent_70%),linear-gradient(to_bottom,transparent_40%,#005BA6)]" />
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
                <Link key={g.id} href={itemHref(g)} className="group flex flex-col gap-4 rounded-3xl border border-line bg-white p-6 text-ink transition-colors hover:border-brand hover:text-ink">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white"><Icon name={TYPE_ICON[g.contentType] ?? "guide"} className="h-5 w-5" /></span>
                    <span className="rounded-full bg-page px-2.5 py-1 text-[11px] font-medium text-ink-muted">{date(g.lastReviewedAt ?? g.publishedAt)}</span>
                  </span>
                  <span className="flex flex-1 flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent-dark">{contentTypeLabel[g.contentType]}</span>
                    <span className="font-display text-[19px] font-bold leading-tight tracking-[-0.01em] text-heading">{g.title}</span>
                  </span>
                  <span className="flex items-center justify-between border-t border-line pt-3 text-[15px] font-semibold text-brand">
                    Read
                    <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-heading transition group-hover:border-brand group-hover:bg-brand group-hover:text-white">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── FAQ: sticky intro with a contact card on the left; a numbered list that opens on the right ── */}
      <section className="border-t border-line bg-white">
        <div className="container-site grid gap-8 py-14 sm:gap-10 sm:py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:gap-16 lg:py-24">
          <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
            <span className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent-dark">FAQ</span>
            <h2 className="text-section-title text-heading">Questions, answered</h2>
            <p className="text-[15px] leading-relaxed text-ink-muted sm:text-base">Short answers about access, sources, prices and payment.</p>
            <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-line bg-page p-5">
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
              <details key={q} open={n === 0} className="group rounded-xl border border-line bg-white px-4 transition-colors hover:border-brand/50 open:border-brand open:bg-brand-tint/50 sm:px-5 [&_summary::-webkit-details-marker]:hidden">
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
function Heading({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <h2 className="text-section-title text-heading">{title}</h2>
      {text ? <p className="text-base leading-relaxed text-ink-muted">{text}</p> : null}
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
    <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-[#EEF5FD] via-[#F7FAFE] to-[#FFF6EE] p-4 xl:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-white px-3.5 py-1.5 text-[14px] font-semibold text-heading shadow-[0_1px_2px_rgba(7,26,51,0.08)]">Example: starting a bakery</span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-muted 2xl:text-[14px]"><BarChart3 aria-hidden className="h-4 w-4 text-brand" />Live sessions coming soon</span>
      </div>
      <div className="grid grid-cols-[1.1fr_1fr] gap-3 2xl:gap-3.5">
        {/* The plan */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(7,26,51,0.06)] xl:p-5">
          <span className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><Icon name="idea" className="h-5 w-5" /></span>
            <span className="whitespace-nowrap rounded-md bg-brand-tint px-2 py-1 text-[13px] font-semibold uppercase text-brand-dark 2xl:text-[14px]">Business plan</span>
            <ChevronRight aria-hidden className="ml-auto h-5 w-5 text-ink-muted" />
          </span>
          <span className="font-display text-[20px] font-semibold leading-tight tracking-[-0.01em] text-heading 2xl:text-[24px]">Bakery business</span>
          <span className="flex-1 text-[14px] leading-relaxed text-ink-muted">Budget, steps, staff and risks.</span>
          <span className="flex flex-wrap gap-1.5">
            {["Small", "Medium", "Large"].map((l) => <span key={l} className="rounded-md bg-page px-2.5 py-1 text-[14px] font-medium text-ink-soft">{l}</span>)}
          </span>
        </div>
        {/* What it links to */}
        <div className="flex flex-col gap-3">
          {linked.map(([href, icon, name, kind, note, tone]) => (
            <Link key={kind} href={href} className="group flex flex-1 items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-[0_1px_3px_rgba(7,26,51,0.06)] hover:text-ink hover:shadow-[0_8px_20px_-10px_rgba(7,26,51,0.3)]">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl 2xl:h-12 2xl:w-12 ${tone}`}><Icon name={icon} className="h-5 w-5 2xl:h-6 2xl:w-6" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-display text-[16px] font-bold leading-tight text-heading 2xl:text-[17px]">{name}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[13px] text-ink-muted">{kind}</span>
                  <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${tone}`}>{note}</span>
                </span>
              </span>
              <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

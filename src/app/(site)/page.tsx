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
      {/* ── Hero: deep navy with a teal-to-blue glow from the bottom-right corner. Big headline, search, chips and
          actions on the left; one clean white card (video or example) on the right, desktop only. ── */}
      <section className="relative isolate overflow-hidden bg-[#071A33] text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_85%_at_100%_100%,#22C7CF_0%,#1E7FDB_38%,rgba(7,26,51,0)_75%)]" />

        <div className="container-site relative grid items-center gap-12 py-12 sm:py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-16">
          <div className="hero-rise flex flex-col items-start gap-7">
            {/* Inter Black (900): Manrope stops at 800. Words blur in one by one, then the verb keeps cycling. */}
            {/* Headline is the blueprint's search prompt (Design Blueprint, section 15). Words blur in one by one;
                "start" carries the orange underline. */}
            <h1 className="font-sans text-[42px] font-black leading-[1.05] tracking-[-0.03em] text-white sm:text-[56px] lg:text-[60px] xl:text-[68px]">
              {["What", "do", "you", "want", "to", "start,", "find", "or", "solve?"].map((w, n) => (
                <span key={w} className="word-in inline-block" style={{ animationDelay: `${n * 90}ms` }}>
                  {w === "start," ? (
                    <span className="relative inline-block">start<span aria-hidden className="absolute inset-x-0 -bottom-[0.04em] h-[0.1em] rounded-full bg-accent" /></span>
                  ) : w}{w === "start," ? "," : ""}{n < 8 ? " " : ""}
                </span>
              ))}
            </h1>

            <p className="max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">
              Pick a business idea, see its dated start-up budget, find the machines and suppliers to equip it, check funding that fits, and save everything you need to act.
            </p>

            <form action="/search" role="search" className="flex w-full max-w-2xl items-center gap-2 rounded-xl bg-white p-1.5 pl-3.5 text-ink-muted ring-4 ring-white/10 sm:p-2 sm:pl-5">
              <Icon name="search" className="h-[18px] w-[18px] shrink-0 sm:h-5 sm:w-5" />
              <label className="sr-only" htmlFor="hero-q">Search all directories</label>
              <input id="hero-q" name="q" type="search" enterKeyHint="search" placeholder="Try “start a bakery”" className="min-h-[44px] w-full min-w-0 bg-transparent text-base sm:min-h-[52px] text-ink outline-none placeholder:text-ink-muted" />
              <button className="btn-primary min-h-[44px] shrink-0 px-4 text-sm sm:min-h-[52px] sm:px-7 sm:text-base">Search</button>
            </form>

            {/* Every directory as a dotted chip */}
            <ul aria-label="Directories" className="-mt-1 flex max-w-2xl flex-wrap gap-2">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group inline-flex items-center gap-1.5 rounded-full border border-dotted border-white/60 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:border-solid hover:border-accent hover:bg-accent hover:text-ink">
                    <Icon name={d.icon} className="h-4 w-4 text-white group-hover:text-ink" />
                    {d.nav}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-1 flex flex-wrap gap-4">
              <Link href="/signup" className="inline-flex min-h-[52px] items-center rounded-md bg-white px-6 text-base font-bold text-ink transition-colors hover:bg-accent hover:text-ink">Get started now</Link>
              <Link href="/search" className="inline-flex min-h-[52px] items-center rounded-md border border-white px-6 text-base font-bold text-white transition-colors hover:bg-white/10 hover:text-white">Search directories</Link>
            </div>
          </div>

          {/* Watch us: the live stream while we're live on YouTube, otherwise the latest video (set at /admin/video).
              Desktop only: on phones it pushed the directories below the fold. */}
          <div id="watch" className="rise-late hidden scroll-mt-28 flex-col items-center gap-6 lg:flex">
            <div className="w-full max-w-xl rounded-2xl bg-white p-4 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-3 pb-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Icon name="video" className="h-4 w-4" /></span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="flex items-center gap-2 text-sm font-bold text-heading">
                    {yt.video?.live ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#FF0033] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
                    ) : null}
                    <span className="truncate">{yt.video?.live ? (yt.video.title ?? "We're live on YouTube") : (yt.video?.title ?? "How BizSphere-Ug works")}</span>
                  </span>
                  <span className="text-xs text-ink-muted">BizSphere-Ug</span>
                </span>
                {yt.channelId ? (
                  <a href={`https://www.youtube.com/channel/${yt.channelId}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md bg-heading px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand hover:text-white">Subscribe</a>
                ) : null}
              </div>
              <div className={`relative aspect-video overflow-hidden rounded-xl ${yt.video ? "bg-black" : "bg-gradient-to-br from-[#EAF4FF] via-white to-[#FFF4EA]"}`}>
                {yt.video ? (
                  <YouTubePlayer id={yt.video.id} title={yt.video.title ?? "BizSphere-Ug on YouTube"} live={yt.video.live} />
                ) : (
                  <Showcase />
                )}
              </div>
            </div>

            {/* Status pill under the card */}
            <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-white/50 bg-white/15 px-6 py-4 text-sm italic text-white backdrop-blur">
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
        <div className="container-site flex flex-col gap-10 py-20 lg:py-24">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <Heading title="What you'll find here" />
            <p className="max-w-md text-base leading-relaxed text-ink-muted sm:text-lg lg:text-right">
              The directories link to each other. Look up “bakery” and you get the plan, the oven, who sells flour and who lends.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} className="group flex flex-col rounded-2xl border border-line bg-white p-7 text-ink transition-colors hover:border-brand hover:text-ink">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white"><Icon name={d.icon} className="h-6 w-6" strokeWidth={1.75} /></span>
                <h3 className="mt-5 font-sans text-[24px] font-black leading-tight tracking-[-0.02em] text-heading">{d.title}</h3>
                <p className="mb-5 mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-ink-muted">{d.text}</p>
                <span className="mt-auto text-[15px] font-semibold text-brand group-hover:underline group-hover:underline-offset-4">Explore {d.short} →</span>
              </Link>
            ))}
            {/* 10 directories in rows of four leave two slots on the last row: fill them with search */}
            <form action="/search" role="search" className="flex flex-col justify-center gap-4 rounded-xl bg-brand-deep p-8 text-white sm:col-span-2">
              <div className="flex flex-col gap-1">
                <span className="font-sans text-[24px] font-black tracking-[-0.02em]">Looking for something specific?</span>
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
          <div className="container-site flex flex-col gap-10 py-20 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-2xl flex-col gap-3">
                <span className="w-fit rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-dark">Resources</span>
                <h2 className="font-sans text-[32px] font-black leading-[1.1] tracking-[-0.02em] text-heading sm:text-[40px]">Recently reviewed</h2>
                <p className="text-base leading-relaxed text-ink-muted sm:text-lg">Guides, tools and news our editors have checked lately. Every page shows the date.</p>
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
                  <span className="font-sans text-[28px] font-black leading-[1.12] tracking-[-0.02em] sm:text-[36px]">{lead.title}</span>
                  {lead.shortSummary ? <span className="line-clamp-3 text-base leading-relaxed text-white/90 sm:text-lg">{lead.shortSummary}</span> : null}
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
                    <span className="font-sans text-[19px] font-black leading-tight tracking-[-0.01em] text-heading">{g.title}</span>
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
        <div className="container-site grid gap-10 py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.5fr)] lg:gap-16 lg:py-24">
          <div className="flex flex-col gap-3 lg:sticky lg:top-28 lg:self-start">
            <span className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent-dark">FAQ</span>
            <h2 className="font-sans text-[32px] font-black leading-[1.1] tracking-[-0.02em] text-heading sm:text-[40px]">Questions, answered</h2>
            <p className="text-base leading-relaxed text-ink-muted sm:text-lg">Short answers about access, sources, prices and payment.</p>
            <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-line bg-page p-5">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/illustrations/coffee.gif" alt="" loading="lazy" width={96} height={72} className="h-14 w-auto shrink-0 mix-blend-multiply" />
                <span className="flex flex-col">
                  <span className="font-sans text-[18px] font-bold text-heading">Still have a question?</span>
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
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint font-sans text-[12px] font-bold text-brand transition-colors group-open:bg-brand group-open:text-white">{String(n + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-sans text-[17px] font-semibold leading-snug text-heading">{q}</span>
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
      <h2 className="font-sans text-[32px] font-black leading-[1.1] tracking-[-0.02em] text-heading sm:text-[40px]">{title}</h2>
      {text ? <p className="text-base leading-relaxed text-ink-muted">{text}</p> : null}
    </div>
  );
}

/**
 * Shown in the hero's window while there is no video: one idea and the machine, supplier and
 * funding it links to, as small example cards. Illustrative only (marked "Example"); no real records.
 */
function Showcase() {
  const card = "flex flex-col gap-1.5 rounded-xl border border-line bg-white p-3 text-left";
  const tag = "w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
  return (
    <div className="absolute inset-0 flex flex-col gap-3 p-4 text-ink xl:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-heading ring-1 ring-line">Example: starting a bakery</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-muted"><Icon name="video" className="h-3.5 w-3.5 text-brand" />Live sessions coming soon</span>
      </div>
      <div className="grid flex-1 grid-cols-[1.15fr_1fr] gap-3">
        {/* The plan */}
        <div className={`${card} justify-between`}>
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white"><Icon name="idea" className="h-4 w-4" /></span>
            <span className={`${tag} bg-brand-tint text-brand-dark`}>Business plan</span>
          </span>
          <span className="font-sans text-base font-black leading-tight text-heading">Bakery business</span>
          <span className="text-[11px] leading-snug text-ink-muted">Budget, steps, staff and risks.</span>
          <span className="flex flex-wrap gap-1">
            {["Low", "Standard", "Higher"].map((l) => <span key={l} className="rounded-md bg-page px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">{l}</span>)}
          </span>
        </div>
        {/* What it links to */}
        <div className="flex flex-col gap-2">
          {[
            ["machine", "Machine", "Deck oven", "Price for members", "bg-accent-tint text-accent-dark"],
            ["supplier", "Supplier", "Flour wholesaler", "Contact checked", "bg-brand-tint text-brand-dark"],
            ["funding", "Funding", "SME loan", "Round open", "bg-brand-tint text-brand-dark"],
          ].map(([icon, kind, name, note, c]) => (
            <div key={kind} className="flex flex-1 items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2 text-left">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-page text-brand"><Icon name={icon} className="h-4 w-4" /></span>
              {/* Name on top, then the kind and its status tag underneath, so nothing has to squeeze */}
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-[12px] font-bold leading-tight text-heading">{name}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-ink-muted">{kind}</span>
                  <span className={`${tag} normal-case tracking-normal ${c}`}>{note}</span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

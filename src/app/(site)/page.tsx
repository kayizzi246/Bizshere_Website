import Link from "next/link";
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
import { Particles } from "@/components/Particles";
import { RotatingWord } from "@/components/RotatingWord";

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
  const [viewer, memberPlan, guides, updates, yt] = await Promise.all([
    getViewer(),
    prisma.membershipPlan.findUnique({ where: { code: "member" } }),
    prisma.contentItem.findMany({
      where: { contentType: { in: ["GUIDE", "TOOL", "RECIPE", "NEWS"] }, publicationStatus: "PUBLISHED" },
      orderBy: [{ lastReviewedAt: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }],
      take: 6,
    }),
    liveSiteUpdates(),
    homeVideo(),
  ]);
  // Directory cards open the onboarding pop-up (sign up → pay) for anyone without full access.
  const onboard = viewer.isMember ? undefined : "";
  const plan = {
    name: memberPlan?.name ?? "Member",
    monthly: memberPlan?.priceMonthly != null ? money(memberPlan.priceMonthly, memberPlan.currency) : null,
    yearly: memberPlan?.priceYearly != null ? money(memberPlan.priceYearly, memberPlan.currency) : null,
  };
  const [lead, ...more] = guides;

  return (
    <>
      {/* ── Hero: the logo's blue. Headline, actions and search on the left; the video on the right
          in a window frame (desktop only), with two small facts floating on its corners. ── */}
      <section className="relative isolate overflow-hidden bg-brand text-white">
        {/* Light from the top right, warm glow bottom left, deeper blue at the foot, drifting particles */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_60%_at_85%_0%,rgba(255,255,255,0.26),transparent_70%),linear-gradient(to_bottom,transparent_50%,#005BA6)]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 -z-10 h-80 w-80 rounded-full bg-accent/25 blur-[110px]" />
        <Particles />

        <div className="container-site relative grid items-center gap-10 py-10 sm:py-12 lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:py-14">
          <div className="hero-rise flex flex-col items-start gap-5">
            {/* Announcement pill */}
            <Link href="/search" className="group inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 py-1 pl-1 pr-3.5 text-xs font-medium text-white backdrop-blur hover:bg-white/15 hover:text-white">
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-ink">New</span>
              Search every directory with its own filters
              <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
            </Link>

            {/* Inter Black (900): Manrope stops at 800. Words blur in one by one, then the verb keeps cycling. */}
            <h1 className="font-sans text-[38px] font-black leading-[1.12] tracking-[-0.02em] text-white sm:text-[44px] lg:text-[40px] xl:text-[46px]">
              {["Plan,", "equip", "and"].map((w, n) => (
                <span key={w} className="word-in inline-block" style={{ animationDelay: `${n * 110}ms` }}>{w}&nbsp;</span>
              ))}
              <br />
              <span className="word-in inline-block" style={{ animationDelay: "330ms" }}>
                <span className="relative inline-block">
                  <RotatingWord words={["fund", "start", "grow", "launch"]} className="text-white" />
                  {/* Orange on this blue is too faint for text, so the word is white with an orange underline */}
                  <span aria-hidden className="absolute inset-x-0 -bottom-[0.04em] h-[0.12em] rounded-full bg-accent" />
                </span>&nbsp;
              </span>
              {["your", "business"].map((w, n) => (
                <span key={w} className="word-in inline-block" style={{ animationDelay: `${440 + n * 110}ms` }}>{w}{n === 0 ? "\u00a0" : ""}</span>
              ))}
            </h1>

            <p className="max-w-xl text-[15px] leading-relaxed text-white/90 sm:text-base">
              Business ideas with start-up budgets, the machines to buy, where to buy them, who lends, and who can advise you. Written and checked for Uganda.
            </p>


            <form action="/search" role="search" className="flex w-full max-w-xl items-center gap-2 rounded-xl bg-white p-1.5 pl-4 text-ink-muted ring-4 ring-white/15">
              <Icon name="search" className="h-5 w-5 shrink-0" />
              <label className="sr-only" htmlFor="hero-q">Search all directories</label>
              <input id="hero-q" name="q" type="search" enterKeyHint="search" placeholder="Try “maize mill” or “bakery”" className="min-h-[44px] w-full min-w-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted" />
              <button className="btn-primary min-h-[44px] shrink-0 px-5">Search</button>
            </form>

            {/* Every directory as a small dotted chip */}
            <ul aria-label="Directories" className="flex max-w-xl flex-wrap gap-2">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group inline-flex items-center gap-1.5 rounded-full border border-dotted border-white/60 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-solid hover:border-accent hover:bg-accent hover:text-ink">
                    <Icon name={d.icon} className="h-3.5 w-3.5 text-white group-hover:text-ink" />
                    {d.nav}
                  </Link>
                </li>
              ))}
            </ul>

          </div>

          {/* Watch us: the live stream while we're live on YouTube, otherwise the latest video (set at /admin/video).
              Desktop only: on phones it pushed the directories below the fold. */}
          <div id="watch" className="rise-late relative hidden scroll-mt-28 lg:block">
            <div className="overflow-hidden rounded-2xl border border-white/25 bg-white/10 p-2 backdrop-blur">
              {/* Window bar */}
              <div className="flex items-center gap-3 px-3 pb-2.5 pt-1.5">
                <span aria-hidden className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/40" /><span className="h-2.5 w-2.5 rounded-full bg-white/40" /><span className="h-2.5 w-2.5 rounded-full bg-white/40" /></span>
                <span className="flex min-w-0 flex-1 items-center justify-center gap-2 text-xs font-medium text-white/85">
                  {yt.video?.live ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#FF0033] px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
                  ) : null}
                  <span className="truncate">{yt.video?.live ? (yt.video.title ?? "We're live on YouTube") : (yt.video?.title ?? "How BizSphere-Ug works")}</span>
                </span>
                {yt.channelId ? (
                  <a href={`https://www.youtube.com/channel/${yt.channelId}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-accent hover:text-ink">Subscribe</a>
                ) : <span aria-hidden className="w-12" />}
              </div>
              <div className={`relative aspect-video overflow-hidden rounded-xl ${yt.video ? "bg-black" : "bg-gradient-to-br from-[#EAF4FF] via-white to-[#FFF4EA]"}`}>
                {yt.video ? (
                  <YouTubePlayer id={yt.video.id} title={yt.video.title ?? "BizSphere-Ug on YouTube"} live={yt.video.live} />
                ) : (
                  <Showcase />
                )}
              </div>
            </div>

            {/* Two true facts floating on the frame's corners */}
            <div className="float absolute -bottom-12 -left-8 flex items-center gap-3 rounded-2xl border border-white/60 bg-white px-4 py-3 text-left text-ink">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name="files" className="h-5 w-5" /></span>
              <span className="flex flex-col leading-tight"><strong className="font-sans text-lg font-black text-heading">{DIRECTORIES.length} directories</strong><span className="text-xs text-ink-muted">linked to each other</span></span>
            </div>
            <span className="float-slow absolute -right-4 -top-6 rotate-[6deg] rounded-xl bg-accent px-3.5 py-2 text-center font-sans text-[13px] font-black leading-tight text-ink ring-4 ring-white/90">
              Everything to start,<br />in one place
            </span>
          </div>
        </div>
      </section>

      {/* ── Updates marquee (managed at /admin/updates) ── */}
      <UpdatesMarquee updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />

      {/* ── Directories ─────────────────────────────────── */}
      <section className="bg-white">
        <div className="container-site flex flex-col gap-8 py-16">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <Heading title="What you'll find here" />
            <p className="max-w-md text-sm leading-relaxed text-ink-muted lg:text-right">
              The directories link to each other. Look up “bakery” and you get the plan, the oven, who sells flour and who lends.
            </p>
          </div>

          <OnboardingGate signedIn={Boolean(viewer.userId)} isMember={viewer.isMember} googleEnabled={googleEnabled} plan={plan}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} data-onboard={onboard} className="group flex flex-col rounded-2xl border border-line bg-white p-6 text-ink transition-colors hover:border-brand hover:text-ink">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white"><Icon name={d.icon} className="h-5 w-5" strokeWidth={1.75} /></span>
                <h3 className="mt-4 font-sans text-[22px] font-black leading-tight tracking-[-0.02em] text-heading">{d.title}</h3>
                <p className="mb-4 mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{d.text}</p>
                <span className="mt-auto text-[13px] font-semibold text-brand group-hover:underline group-hover:underline-offset-4">Explore {d.short} →</span>
              </Link>
            ))}
            {/* 10 directories in rows of four leave two slots on the last row: fill them with search */}
            <form action="/search" role="search" className="flex flex-col justify-center gap-4 rounded-xl bg-brand-deep p-8 text-white sm:col-span-2">
              <div className="flex flex-col gap-1">
                <span className="font-display text-base font-extrabold">Looking for something specific?</span>
                <span className="text-[13px] leading-relaxed text-white/70">Search by business, product or town.</span>
              </div>
              <label className="flex items-center gap-2 rounded-lg bg-white p-1.5 pl-3 text-ink-muted">
                <Icon name="search" className="h-4 w-4 shrink-0" />
                <span className="sr-only">Search all directories</span>
                <input name="q" type="search" placeholder="e.g. maize mill" className="min-h-[44px] w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted" />
                <button className="btn min-h-[44px] shrink-0 bg-accent px-4 text-ink hover:bg-accent/90 hover:text-ink">Search</button>
              </label>
            </form>
          </div>
          </OnboardingGate>
        </div>
      </section>


      {/* ── Recently reviewed: bento. The newest guide as a large blue card, four more around it. ── */}
      {lead ? (
        <section className="bg-white">
          <div className="container-site flex flex-col gap-8 py-16">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-2xl flex-col gap-3">
                <span className="w-fit rounded-full bg-brand-tint px-3 py-1 text-xs font-semibold text-brand-dark">Resources</span>
                <h2 className="font-sans text-[28px] font-black leading-[1.15] tracking-[-0.02em] text-heading sm:text-[34px]">Recently reviewed</h2>
                <p className="text-[15px] leading-relaxed text-ink-muted">Guides, tools and news our editors have checked lately. Every page shows the date.</p>
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
                  <span className="font-sans text-[26px] font-black leading-[1.15] tracking-[-0.02em] sm:text-[32px]">{lead.title}</span>
                  {lead.shortSummary ? <span className="line-clamp-3 text-[15px] leading-relaxed text-white/90">{lead.shortSummary}</span> : null}
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
                    <span className="font-sans text-[17px] font-black leading-tight tracking-[-0.01em] text-heading">{g.title}</span>
                  </span>
                  <span className="flex items-center justify-between border-t border-line pt-3 text-[13px] font-semibold text-brand">
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
        <div className="container-site grid gap-10 py-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-16">
          <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
            <span className="w-fit rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent-dark">FAQ</span>
            <h2 className="font-sans text-[28px] font-black leading-[1.15] tracking-[-0.02em] text-heading sm:text-[34px]">Questions, answered</h2>
            <p className="text-[15px] leading-relaxed text-ink-muted">Short answers about access, sources, prices and payment.</p>
            <div className="mt-2 flex flex-col gap-4 rounded-3xl border border-line bg-page p-6">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/illustrations/coffee.gif" alt="" loading="lazy" width={96} height={72} className="h-14 w-auto shrink-0 mix-blend-multiply" />
                <span className="flex flex-col">
                  <span className="font-sans text-[17px] font-black text-heading">Still have a question?</span>
                  <span className="text-[13px] text-ink-muted">Our team replies to every message.</span>
                </span>
              </div>
              <Link href="/contact" className="btn-primary min-h-[44px]">Contact us <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {FAQ.map(([q, a], n) => (
              <details key={q} open={n === 0} className="group rounded-2xl border border-transparent px-5 transition-colors open:border-line open:bg-page hover:bg-page [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-4 py-4">
                  <span className="w-7 shrink-0 font-mono text-xs font-semibold text-ink-muted group-open:text-brand">{String(n + 1).padStart(2, "0")}</span>
                  <span className="flex-1 font-display text-[15px] font-bold leading-snug text-heading">{q}</span>
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-lg leading-none text-heading transition group-open:rotate-45 group-open:border-brand group-open:bg-brand group-open:text-white">+</span>
                </summary>
                <p className="pb-5 pl-11 pr-12 text-[15px] leading-relaxed text-ink-muted">{a}</p>
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
      <h2 className="text-lg font-extrabold tracking-tight text-heading sm:text-xl">{title}</h2>
      {text ? <p className="text-[13px] leading-relaxed text-ink-muted">{text}</p> : null}
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

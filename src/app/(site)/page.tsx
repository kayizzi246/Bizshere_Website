import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cachedRecentGuides, cachedSiteUpdates } from "@/lib/cached";
import { DIRECTORIES } from "@/config/directories";
import { contentTypeLabel, date, itemHref } from "@/lib/format";
import { homeVideo } from "@/lib/youtube";
import { Icon } from "@/components/Icon";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { GradientMesh } from "@/components/ui/gradient-mesh";
import { HomeSearch } from "@/components/HomeSearch";
import { RecentStrip } from "@/components/Recent";
import { getViewer } from "@/lib/access";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Homepage. Every record shown comes from the database or is a true product fact.
 * No invented customer logos, testimonials or user counts.
 */

const TYPE_ICON: Record<string, string> = { GUIDE: "guide", TOOL: "tool", NEWS: "news", RECIPE: "recipe" };


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
      {/* ── Hero: blue animated gradient mesh. The floating header sits on it (.under-header).
          Left: the "What's new" ticker, the headline, one sentence, search, popular directories, two actions and
          what people worry about before paying (free search, mobile money, cancel any time).
          Right (wide screens): the "How it works" card in a frosted frame. ── */}
      <section className="under-header relative isolate overflow-hidden text-white">
        <GradientMesh />
        <div className="container-site relative grid items-center gap-8 pb-8 pt-5 sm:pb-10 sm:pt-7 xl:grid-cols-[1.25fr_1fr] xl:gap-12 2xl:gap-20">
          <div className="hero-rise flex flex-col items-start gap-3.5 sm:gap-4">
            {/* Updates ticker (managed at /admin/updates) */}
            <UpdatesMarquee dark updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />
            {/* "B2B INFORMATION PORTAL" in Inter Black (900; Manrope stops at 800): "B2B" in orange,
                "PORTAL" in a sky-to-white gradient. The site name stays in the heading for screen readers and search. */}
            <h1 className="flex flex-col font-sans font-black uppercase leading-[0.92] tracking-[-0.04em] text-white">
              <span className="sr-only">Bizsphere-UG – </span>
              <span className="text-[30px] sm:text-[46px] xl:text-[48px] 2xl:text-[58px]">
                <span className="text-accent">B2B</span> Information
              </span>
              <span className="bg-gradient-to-r from-sky-300 via-cyan-100 to-white bg-clip-text pb-1 text-[42px] text-transparent sm:text-[62px] xl:text-[60px] 2xl:text-[72px]">
                Portal
              </span>
            </h1>

            <p className="max-w-2xl text-[14px] leading-relaxed text-white/75 sm:text-[16px]">
              Up-to-Date Market Prices, Business Ideas, Trusted Suppliers, Business Machines, Funding Sources, Business Experts, Business Guides, Business Tools and Business News, all in one place.{" "}
              <span className="font-semibold text-white">Start exploring now.</span>
            </p>

            <HomeSearch />

            {/* Every directory as a chip, right under the search: a tidy grid of equal, compact chips */}
            <ul aria-label="Directories" className="grid w-full max-w-[660px] grid-cols-2 gap-1.5 sm:grid-cols-3">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group flex h-full min-h-[40px] items-center gap-2 rounded-lg border border-white/20 bg-white/[0.08] px-2.5 py-1 backdrop-blur-sm text-[13px] font-semibold leading-tight text-white/90 transition-colors hover:border-accent hover:bg-accent hover:text-ink sm:text-[14px]">
                    <Icon name={d.icon} className="h-4 w-4 shrink-0 text-accent group-hover:text-ink" />
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-3">
              <Link href="/signup" className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-accent px-6 text-[15px] font-bold text-ink transition-colors hover:bg-white hover:text-ink">Get started free<ChevronRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
              <Link href="/business-ideas" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/25 bg-white/[0.08] px-6 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/15 hover:text-white">Browse business ideas</Link>
            </div>

          </div>

          {/* How it works: the live stream while we're live on YouTube, otherwise the latest video (set at
              /admin/video), otherwise the bakery example. Wide screens only (1280px+): narrower, it pushed the directories down. */}
          <div id="watch" className="rise-late hidden scroll-mt-28 flex-col items-center xl:flex">
            <div className="mesh-float w-full max-w-[460px] rounded-[26px] border border-white/20 bg-white/10 p-2 backdrop-blur-xl">
            <div className="rounded-[20px] bg-white p-4 text-ink">
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
            </div>
          </div>
        </div>

      </section>

      {/* ── Directories ─────────────────────────────────── */}
      <section id="directories" className="scroll-mt-24 bg-white">
        <div className="container-site flex flex-col gap-8 py-14 sm:gap-10 sm:py-20 lg:py-24">
          {/* Returning visitors: what they opened last time, first. Empty on a first visit. */}
          <RecentStrip title="Welcome back · pick up where you left off" className="-mt-6 sm:-mt-10" />
          {/* Short and simple: a label and one clear title */}
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-tint px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-accent-dark">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              {DIRECTORIES.length} directories in one place
            </span>
            <h2 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[42px] lg:text-[50px]">
              Everything you need to <span className="text-brand">start and grow</span> your business
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 rounded-2xl border border-line bg-white p-5 text-ink transition-colors hover:border-brand hover:text-ink sm:flex sm:flex-col sm:p-7">
                <span className="row-span-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-12 sm:w-12"><Icon name={d.icon} className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} /></span>
                <h3 className="font-display text-[17px] font-extrabold sm:mt-5 sm:text-[19px] leading-tight tracking-[-0.025em] text-heading">{d.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted sm:mb-5 sm:mt-2.5 sm:line-clamp-3 sm:text-sm">{d.text}</p>
                <span className="mt-2 text-sm font-semibold text-brand sm:mt-auto sm:text-[15px] group-hover:underline group-hover:underline-offset-4">Explore {d.title} →</span>
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


      {/* ── Recently reviewed: bento on deep brand blue, so it stands apart from the white directories above and the
          footer below. The newest guide as a large blue card, four more as outlined dark cards. ── */}
      {/* Members only: visitors and signed-in non-payers don't see this section at all */}
      {lead && viewer.isMember ? (
        <section className="bg-brand-deep text-white">
          <div className="container-site flex flex-col gap-8 py-14 sm:gap-10 sm:py-20 lg:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex max-w-2xl flex-col gap-3">
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
                    <span className="text-[13px] font-semibold text-accent">{contentTypeLabel[g.contentType]}</span>
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
    </>
  );
}

/** Section heading: dark title, optional one-line intro. */
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
    <div className="flex flex-col gap-3 rounded-2xl bg-page p-3 xl:p-4">
      <span className="w-fit rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-heading">Example: starting a bakery</span>
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

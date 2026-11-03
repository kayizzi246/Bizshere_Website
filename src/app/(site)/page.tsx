import Link from "next/link";
import { cachedSiteUpdates } from "@/lib/cached";
import { DIRECTORIES } from "@/config/directories";
import { homeVideo } from "@/lib/youtube";
import { Icon } from "@/components/Icon";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { HomeSearch } from "@/components/HomeSearch";
import { RecentStrip } from "@/components/Recent";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Homepage. Every record shown comes from the database or is a true product fact.
 * No invented customer logos, testimonials or user counts.
 */


export default async function HomePage() {
  const [updates, yt] = await Promise.all([cachedSiteUpdates(), homeVideo()]);

  return (
    <>
      {/* ── Hero: one solid deep navy (bg-navy), the same colour as every other hero. Left: the "What's new"
          ticker, "B2B Information Portal", one sentence of what is here, search, every directory as a
          dotted pill, two actions.
          Right (wide screens): the "How it works" card. One column below xl: minmax(0,1fr) keeps the wide
          ticker from stretching the page past the screen on phones. ── */}
      <section className="under-header relative isolate overflow-hidden bg-navy text-white">
        <div className="container-site relative grid grid-cols-[minmax(0,1fr)] items-center gap-8 pb-10 pt-6 sm:pb-12 sm:pt-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:gap-12">
          <div className="hero-rise flex min-w-0 flex-col items-start gap-4 sm:gap-5">
            {/* Updates ticker (managed at /admin/updates) */}
            <UpdatesMarquee dark updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />

            {/* The client's message, word for word: "B2B Information Portal", B2B in orange */}
            <h1 className="text-hero max-w-4xl text-[46px] text-white sm:text-[68px] xl:text-[76px] 2xl:text-[88px]">
              <span className="sr-only">Bizsphere-UG: </span>
              <span className="text-accent">B2B</span> Information Portal
            </h1>

            <p className="max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-[17px]">
              Up-to-Date Market Prices, Business Ideas, Trusted Suppliers, Business Machines, Funding Sources, Business Experts, Business Guides, Business Tools and Business News, all in one place.{" "}
              <span className="font-semibold text-white">Start exploring now.</span>
            </p>

            <HomeSearch />

            {/* Every directory as a pill with a dotted border; they wrap to fit any screen */}
            <ul aria-label="Directories" className="flex max-w-[680px] flex-wrap gap-2">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group inline-flex min-h-[40px] items-center gap-2 rounded-full border-2 border-dotted border-white/50 bg-white/[0.04] px-3.5 py-1.5 text-[14px] font-semibold leading-tight text-white transition-colors hover:border-solid hover:border-accent hover:bg-accent hover:text-ink sm:text-[15px]">
                    <Icon name={d.icon} className="h-4 w-4 shrink-0 text-white/90 group-hover:text-ink" />
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:gap-3">
              <Link href="/signup" className="group inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-accent px-7 text-[15px] font-bold text-ink transition-colors hover:bg-white hover:text-ink">Get started free<ChevronRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
              <Link href="/business-ideas" className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-7 text-[15px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10 hover:text-white">Browse business ideas</Link>
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
        <div className="container-site flex flex-col gap-6 py-10 sm:gap-8 sm:py-14 lg:py-16">
          {/* Returning visitors: what they opened last time, first. Empty on a first visit. */}
          <RecentStrip title="Welcome back · pick up where you left off" className="-mt-2 sm:-mt-4" />
          {/* Section header, left-aligned: label and title on the left, one line and search on the right */}
          <div className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between md:gap-10">
            <div className="flex max-w-2xl flex-col gap-2.5">
              <span className="inline-flex items-center gap-2 font-display text-[12px] font-bold uppercase tracking-[0.14em] text-brand">
                <span aria-hidden className="h-[3px] w-6 rounded-full bg-accent" />
                {DIRECTORIES.length} directories
              </span>
              <h2 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] text-heading sm:text-[36px] lg:text-[40px]">
                Everything to start <span className="text-brand">and grow your business</span>
              </h2>
            </div>
            <p className="text-[15px] leading-relaxed text-ink-muted md:max-w-xs md:text-right">Free to browse. Pick one to start.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {DIRECTORIES.map((d) => (
              <Link key={d.href} href={d.href} className="group grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 rounded-2xl border border-line bg-white p-5 text-ink transition-colors hover:border-brand hover:text-ink sm:flex sm:flex-col sm:p-6">
                <span className="row-span-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-12 sm:w-12"><Icon name={d.icon} className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} /></span>
                <h3 className="font-display text-[17px] font-extrabold sm:mt-5 sm:text-[19px] leading-tight tracking-[-0.025em] text-heading">{d.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted sm:mb-5 sm:mt-2.5 sm:line-clamp-3 sm:text-sm">{d.text}</p>
                <span className="mt-2 text-sm font-semibold text-brand sm:mt-auto sm:text-[15px] group-hover:underline group-hover:underline-offset-4">Explore {d.title} →</span>
              </Link>
            ))}
            {/* 10 directories in rows of four leave two slots on the last row: fill them with search */}
            {/* Same look as the hero: navy, rounded search bar, orange button */}
            <form action="/search" role="search" className="flex flex-col justify-center gap-4 rounded-2xl bg-navy p-5 text-white sm:col-span-2 sm:p-6">
              <div className="flex flex-col gap-1">
                <span className="font-display text-[22px] font-extrabold tracking-[-0.02em] sm:text-[24px]">Looking for something specific?</span>
                <span className="text-[15px] leading-relaxed text-white/75">Search by business, product or town.</span>
              </div>
              <label className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 text-ink-muted">
                <Icon name="search" className="h-4 w-4 shrink-0" />
                <span className="sr-only">Search all directories</span>
                <input name="q" type="search" placeholder="e.g. maize mill" className="min-h-[44px] w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted" />
                <button className="inline-flex h-11 shrink-0 items-center rounded-full bg-accent px-5 text-[15px] font-semibold text-ink hover:bg-white hover:text-ink">Search</button>
              </label>
            </form>
          </div>
        </div>
      </section>

    </>
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

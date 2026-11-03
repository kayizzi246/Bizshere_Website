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
      <section className="under-header relative isolate overflow-hidden hero-glow bg-navy text-white">
        {/* Measured layout (client spec, Nov 2026): 680px text column, 96px gap, 450px card set 120px lower;
            48px above and 64px below (raised from 35/46); 12–16px between the elements; 68px headline. One column below xl. */}
        <div className="container-site relative grid grid-cols-[minmax(0,1fr)] gap-10 pb-[64px] pt-[48px] xl:grid-cols-[minmax(0,680px)_450px] xl:items-start xl:gap-x-[96px]">
          <div className="hero-rise flex min-w-0 flex-col items-start">
            {/* Updates ticker (managed at /admin/updates) */}
            <UpdatesMarquee dark updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />

            {/* The client's message, word for word: "B2B Information Portal", B2B in orange */}
            <h1 className="text-hero mb-3 mt-4 text-[38px] text-white sm:text-[54px] xl:text-[68px]">
              <span className="sr-only">Bizsphere-UG: </span>
              <span className="text-accent">B2B</span> Information Portal
            </h1>

            <p className="mb-4 max-w-2xl text-[16px] leading-[1.5] text-white/80 sm:text-[18px]">
              Up-to-Date Market Prices, Business Ideas, Trusted Suppliers, Business Machines, Funding Sources, Business Experts, Business Guides, Business Tools and Business News, all in one place.{" "}
              <span className="font-semibold text-white">Start exploring now.</span>
            </p>

            <HomeSearch />

            {/* Every directory as a pill with a dotted border; they wrap to fit any screen */}
            <ul aria-label="Directories" className="mt-4 flex max-w-[680px] flex-wrap gap-2">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group inline-flex min-h-[46px] items-center gap-1.5 rounded-full border-2 border-dotted border-white/50 bg-white/[0.04] px-3 py-2 text-[14px] font-semibold leading-tight text-white transition-colors hover:border-solid hover:border-accent hover:bg-accent hover:text-ink sm:min-h-[40px] sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[15px]">
                    <Icon name={d.icon} className="h-[18px] w-[18px] shrink-0 text-white/90 group-hover:text-ink sm:h-4 sm:w-4" />
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/signup" className="group inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-accent px-7 text-[15px] font-bold text-ink transition-colors hover:bg-white hover:text-ink">Get started free<ChevronRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>
              <Link href="/business-ideas" className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-7 text-[15px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10 hover:text-white">Browse business ideas</Link>
            </div>
          </div>

          {/* How it works: the live stream while we're live on YouTube, otherwise the latest video (set at
              /admin/video), otherwise the bakery example. Wide screens only (1280px+): narrower, it pushed the directories down. */}
          <div id="watch" className="rise-late hidden scroll-mt-28 flex-col xl:mt-[120px] xl:flex">
            <div className="w-full rounded-3xl border border-white/15 bg-white/[0.06] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <div className="flex items-center gap-3 pb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-ink"><Icon name="video" className="h-4 w-4" /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-display text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-white">
                    {yt.video?.live ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#FF0033] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
                    ) : null}
                    <span className="truncate">{yt.video?.live ? (yt.video.title ?? "We're live on YouTube") : (yt.video?.title ?? "How Bizsphere-Ug works")}</span>
                  </span>
                  <span className="text-[12px] text-white/60">From idea to action in four steps.</span>
                </span>
                {yt.channelId ? (
                  <a href={`https://www.youtube.com/channel/${yt.channelId}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[13px] font-semibold text-white hover:border-accent hover:bg-accent hover:text-ink">
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

      </section>

      {/* ── Directories ─────────────────────────────────── */}
      <section id="directories" className="scroll-mt-24 bg-white">
        <div className="container-site flex flex-col gap-6 py-10 sm:gap-8 sm:py-14 lg:py-16">
          {/* Returning visitors: what they opened last time, first. Empty on a first visit. */}
          <RecentStrip title="Welcome back · pick up where you left off" className="-mt-2 sm:-mt-4" />
          {/* Section header: a short, upbeat call, centred, with the same orange underline as the hero */}
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-tint px-3.5 py-1.5 text-[13px] font-semibold text-brand-dark">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
              {DIRECTORIES.length} directories · Free to browse
            </span>
            <h2 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-heading sm:text-[46px] lg:text-[54px]">
              Find it. Price it.{" "}
              <span className="relative inline-block whitespace-nowrap text-brand">
                Start it.
                <span aria-hidden className="absolute inset-x-0 -bottom-1 h-[5px] rounded-full bg-accent" />
              </span>
            </h2>
            <p className="max-w-xl text-[16px] leading-relaxed text-ink-muted sm:text-[17px]">Pick a directory and explore. Every page is checked by our team.</p>
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
 * Shown in the hero's card while there is no video: starting a bakery as a four-step journey
 * (idea, machine, supplier, funding), one row per step joined by a line. Illustrative only
 * (marked "Example"); each row opens that directory.
 */
function Showcase() {
  // [href, icon, step, example, badge, icon tile colour]
  const steps: [string, string, string, string, string, string][] = [
    ["/business-ideas", "idea", "Pick an idea", "Bakery business", "Small · Medium · Large", "bg-[#2E6BFF]/20 text-[#8FB0FF]"],
    ["/machines", "machine", "Get the machine", "Deck oven", "Price for members", "bg-accent/20 text-accent"],
    ["/suppliers", "supplier", "Find a supplier", "Flour wholesaler", "Contact checked", "bg-[#12B76A]/20 text-[#5BE3A1]"],
    ["/funding", "funding", "Fund it", "SME loan", "Round open", "bg-[#8B6CFF]/20 text-[#B9A6FF]"],
  ];
  return (
    <div className="flex flex-col gap-3">
      <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white/80">Example: starting a bakery</span>
      <ol className="relative flex flex-col gap-2">
        {/* The line joining the steps, behind the icon tiles */}
        <span aria-hidden className="absolute bottom-7 left-[30px] top-7 w-px bg-gradient-to-b from-white/30 via-white/15 to-white/30" />
        {steps.map(([href, icon, step, example, badge, tone], n) => (
          <li key={href}>
            <Link href={href} className="group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-navy/60 px-3 py-2.5 text-white transition-colors hover:border-accent/60 hover:bg-navy/80 hover:text-white">
              <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} className="h-4 w-4" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">{n + 1}. {step}</span>
                <span className="truncate font-display text-[15px] font-bold leading-tight text-white">{example}</span>
              </span>
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/75">{badge}</span>
              <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

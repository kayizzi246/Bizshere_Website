import Link from "next/link";
import { cachedSiteUpdates } from "@/lib/cached";
import { DIRECTORIES } from "@/config/directories";
import { homeVideo } from "@/lib/youtube";
import { Icon } from "@/components/Icon";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { GradientMesh } from "@/components/ui/gradient-mesh";
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
      {/* ── Hero: deep navy (bg-navy) with a soft blue glow. Left: the "What's new" ticker, the call ("What do you want to start, find or
          solve?"), one sentence, search, every directory as a dotted pill, two actions.
          Right (wide screens): the "How it works" card. One column below xl: minmax(0,1fr) keeps the wide
          ticker from stretching the page past the screen on phones. ── */}
      <section className="under-header relative isolate overflow-hidden bg-navy text-white">
        <GradientMesh />
        <div className="container-site relative grid grid-cols-[minmax(0,1fr)] items-center gap-8 pb-10 pt-6 sm:pb-12 sm:pt-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:gap-12">
          <div className="hero-rise flex min-w-0 flex-col items-start gap-4 sm:gap-5">
            {/* Updates ticker (managed at /admin/updates) */}
            <UpdatesMarquee dark updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />

            <h1 className="max-w-3xl font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.035em] text-white sm:text-[48px] xl:text-[54px] 2xl:text-[60px]">
              <span className="sr-only">Bizsphere-UG: </span>
              What do you want to{" "}
              {/* "start," kept together so the comma never wraps onto its own line */}
              <span className="whitespace-nowrap">
                <span className="relative inline-block">
                  start
                  <span aria-hidden className="absolute inset-x-0 -bottom-1 h-[5px] rounded-full bg-accent sm:h-[6px]" />
                </span>
                ,
              </span>{" "}
              find or solve?
            </h1>

            <p className="max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-[17px]">
              Pick a business idea, see its dated start-up budget, find the machines and suppliers to equip it, check funding that fits, and save everything you need to act.
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

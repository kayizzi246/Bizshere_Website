import Link from "next/link";
import { DIRECTORIES } from "@/config/directories";
import { homeVideo } from "@/lib/youtube";
import { cachedSiteUpdates } from "@/lib/cached";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { Icon } from "@/components/Icon";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { HomeSearch } from "@/components/HomeSearch";
import { HomeFeatures } from "@/components/HomeFeatures";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer, FREE_PREVIEW } from "@/lib/access";
import { date, money } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Homepage. Every record shown comes from the database or is a true product fact.
 * No invented customer logos, testimonials or user counts.
 */


export default async function HomePage() {
  const viewer = await getViewer();
  const [updates, yt, prices] = await Promise.all([cachedSiteUpdates(), homeVideo(), marketSnapshot(viewer.isMember)]);

  return (
    <>
      {/* ── Hero: deep navy (bg-navy) with the same light as every other hero, held still here (hero-still)
          and with no entrance animations: a calm, working front page. Left:
          "B2B Information Portal", one sentence of what is here, search, every directory as a quiet link
          tile, two actions.
          Right (wide screens): today's market prices, a reason to come back daily. One column below xl:
          minmax(0,1fr) keeps long content from stretching the page past the screen on phones. ── */}
      <section className="under-header relative isolate overflow-hidden hero-glow hero-still bg-navy text-white">
        {/* Measured layout (client spec, Nov 2026): 680px text column, 96px gap, 450px card set 120px lower;
            about 100px above and 140px below (raised from 35/46, then 48/64, then 64/80, then 80/112); 12–16px between the elements; 48px headline on one line (was 68px). One column below xl. */}
        {/* Updates ribbon across the whole width (managed at /admin/updates), no label. Phones: tighter above and below. */}
        <div className="container-site relative pt-1.5 sm:pt-[40px]">
          <UpdatesMarquee dark updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />
        </div>
        <div className="container-site relative grid grid-cols-[minmax(0,1fr)] gap-10 pb-[140px] pt-2 sm:pt-[72px] xl:grid-cols-[minmax(0,680px)_450px] xl:items-start xl:gap-x-[96px]">
          <div className="flex min-w-0 flex-col items-start">

            {/* The client's message, word for word: "B2B Information Portal", B2B in orange */}
            {/* One line on every screen: the text is about 13.5× the font size wide, so phones scale with the
                screen (6.2vw: 20px on a 320px phone, 30px at most) and wider screens step up to 40px and 48px. */}
            <h1 className="text-hero mb-3 whitespace-nowrap text-[clamp(20px,6.2vw,30px)] text-white sm:text-[40px] lg:text-[48px]">
              <span className="sr-only">Bizsphere-UG: </span>
              <span className="text-accent">B2B</span> Information Portal
            </h1>

            <p className="mb-4 max-w-2xl text-[14px] leading-[1.55] text-white/80 sm:text-[18px]">
              Up-to-Date Market Prices, Business Ideas, Trusted Suppliers, Business Machines, Funding Sources, Business Experts, Business Guides, Business Tools and Business News, all in one place.{" "}
              <span className="font-semibold text-white">Start exploring now.</span>
            </p>

            <HomeSearch />

            {/* Every directory as a link tile: on phones bigger tiles with a dotted border, two to a row, from sm a quiet hairline tile */}
            <ul aria-label="Directories" className="mt-4 grid w-full max-w-[680px] grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group flex h-full min-h-[52px] w-full items-center gap-2 rounded-lg border-2 border-dotted border-white/50 bg-white/[0.05] px-3 py-2.5 text-[15px] font-medium leading-tight text-white/90 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white sm:inline-flex sm:h-auto sm:w-auto sm:min-h-[38px] sm:border sm:border-solid sm:border-white/15 sm:px-3 sm:py-1.5 sm:text-[14px]">
                    <Icon name={d.icon} className="h-[18px] w-[18px] shrink-0 text-accent sm:h-4 sm:w-4" />
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link {...(viewer.userId && viewer.isMember ? { href: "/business-ideas" } : { href: "/membership?onboard=pay&next=%2Fbusiness-ideas", "data-pay": "", "data-next": "/business-ideas" })} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-lg bg-accent px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-white hover:text-ink">{viewer.isMember ? "Browse business ideas" : "Get full access"}<ChevronRight aria-hidden className="h-4 w-4" /></Link>
              <Link href="/prices" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/25 px-6 text-[15px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10 hover:text-white">Check today&apos;s prices</Link>
            </div>
          </div>

          {/* Right panel: the live stream while we're live on YouTube; otherwise today's market prices (with
              the latest video as a link under them); with no prices yet, the latest video (set at /admin/video)
              or the bakery example. Wide screens only (1280px+): narrower, it pushed the directories down. */}
          <div id="watch" className="hidden scroll-mt-28 flex-col xl:mt-[24px] xl:flex">
            {!yt.video?.live && prices.rows.length ? (
              <PricePanel {...prices} video={yt.video ? { id: yt.video.id, title: yt.video.title } : null} />
            ) : (
            <div className="w-full rounded-2xl border border-white/15 bg-white/[0.06] p-5">
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
            )}
          </div>
        </div>

      </section>

      {/* ── What the platform offers, a different block for each part ── */}
      <HomeFeatures />

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

type Snapshot = { rows: { id: string; name: string; unit: string | null; price: string; change: number | null }[]; updated: string | null };

/**
 * The latest wholesale prices for the hero: the six most recently updated products, worked out as on
 * /prices (average of each market's latest price, change since that market's previous price, like
 * units only). Visitors see only the first FREE_PREVIEW.markets markets per product, so the panel
 * never shows a member-only price.
 */
async function marketSnapshot(isMember: boolean): Promise<Snapshot> {
  const [products, observations] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true, grade: true, standardUnit: true } }),
    prisma.priceObservation.findMany({
      where: { priceType: "WHOLESALE", status: "PUBLISHED" },
      select: { productId: true, marketId: true, priceMin: true, priceMax: true, currency: true, quotedUnit: true, observedAt: true },
      orderBy: { observedAt: "desc" },
      take: 3000,
    }),
  ]);
  type Obs = (typeof observations)[number];
  const byProduct = new Map<string, Map<string, Obs[]>>();
  for (const o of observations) {
    const p = products.find((x) => x.id === o.productId);
    if (p?.standardUnit && o.quotedUnit !== p.standardUnit) continue;
    const markets = byProduct.get(o.productId) ?? new Map<string, Obs[]>();
    const list = markets.get(o.marketId) ?? [];
    if (list.length < 2) list.push(o);
    markets.set(o.marketId, list);
    byProduct.set(o.productId, markets);
  }
  const mid = (o: Obs) => {
    const a = Number(o.priceMin ?? o.priceMax), b = Number(o.priceMax ?? o.priceMin);
    return Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : null;
  };
  const board = products.flatMap((p) => {
    const markets = [...(byProduct.get(p.id)?.values() ?? [])];
    const seen = isMember ? markets : markets.slice(0, FREE_PREVIEW.markets);
    const now = seen.map((m) => mid(m[0])).filter((n): n is number => n !== null);
    if (!now.length) return [];
    const changes = seen.filter((m) => m[1]).map((m) => { const a = mid(m[1]), b = mid(m[0]); return a && b ? ((b - a) / a) * 100 : null; }).filter((n): n is number => n !== null);
    return [{
      id: p.id,
      name: `${p.name}${p.grade ? `, ${p.grade}` : ""}`,
      unit: p.standardUnit,
      price: money(Math.round(now.reduce((s, n) => s + n, 0) / now.length), seen[0][0].currency),
      change: changes.length ? changes.reduce((s, n) => s + n, 0) / changes.length : null,
      latest: seen.reduce((d, m) => (m[0].observedAt > d ? m[0].observedAt : d), seen[0][0].observedAt),
    }];
  }).sort((a, b) => b.latest.getTime() - a.latest.getTime()).slice(0, 6);
  return { rows: board.map(({ latest: _latest, ...r }) => r), updated: board[0] ? date(board[0].latest) : null };
}

/** The hero's price panel: a plain table of today's prices, a link to the full board, and the latest video as a link. */
function PricePanel({ rows, updated, video }: Snapshot & { video: { id: string; title: string | null } | null }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/15 bg-[#0B2240]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <span className="flex flex-col gap-0.5">
          <span className="font-display text-[16px] font-bold text-white">Market prices</span>
          <span className="text-[12px] text-white/55">Wholesale · Uganda{updated ? ` · updated ${updated}` : ""}</span>
        </span>
        <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">Latest</span>
      </div>
      <ul className="divide-y divide-white/10">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/prices?q=${encodeURIComponent(r.name.split(",")[0])}`} className="flex items-center gap-3 px-5 py-3 text-white hover:bg-white/[0.04] hover:text-white">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold">{r.name}</span>
                {r.unit ? <span className="text-[12px] text-white/50">per {r.unit}</span> : null}
              </span>
              <span className="shrink-0 text-right text-[14px] font-semibold tabular-nums">{r.price}</span>
              <span className={`inline-flex w-[68px] shrink-0 items-center justify-end gap-1 text-[12px] font-semibold tabular-nums ${r.change === null || Math.abs(r.change) < 0.05 ? "text-white/45" : r.change > 0 ? "text-[#3DD68C]" : "text-[#FF6B6B]"}`}>
                {r.change !== null && r.change >= 0.05 ? <TrendingUp aria-hidden className="h-3.5 w-3.5" /> : r.change !== null && r.change <= -0.05 ? <TrendingDown aria-hidden className="h-3.5 w-3.5" /> : null}
                {r.change === null ? "–" : `${r.change > 0 ? "+" : ""}${r.change.toFixed(1)}%`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5">
        <Link href="/prices" className="inline-flex items-center gap-1 text-[14px] font-semibold text-accent hover:text-white">See all prices<ChevronRight aria-hidden className="h-4 w-4" /></Link>
        {video ? (
          <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-white/60 hover:text-white">
            <Icon name="video" className="h-4 w-4 shrink-0" /><span className="truncate">How Bizsphere-Ug works</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

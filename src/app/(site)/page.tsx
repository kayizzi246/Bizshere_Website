import Link from "next/link";
import { DIRECTORIES } from "@/config/directories";
import { homeVideo } from "@/lib/youtube";
import { cachedSiteUpdates } from "@/lib/cached";
import { UpdatesMarquee } from "@/components/UpdatesMarquee";
import { Icon } from "@/components/Icon";
import { YouTubePlayer } from "@/components/YouTubePlayer";
import { HomeSearch } from "@/components/HomeSearch";
import { HomeFeatures } from "@/components/HomeFeatures";
import { HeroCollage, type CollagePhoto } from "@/components/HeroCollage";
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
  // Nothing under the hero buttons: no counts, prices or payment talk on the homepage (client, 10 Nov 2026).
  const [updates, yt, prices, photos] = await Promise.all([cachedSiteUpdates(), homeVideo(), marketSnapshot(viewer.isMember), heroPhotos()]);

  return (
    <div className="home-wide">
      {/* ── Hero: midnight navy into royal blue (.hero-premium) with a moving network of lights (HeroParticles)
          and no entrance animations. Left:
          "B2B Information Portal", one sentence of what is here, search, every directory as a quiet link
          tile, two actions.
          Right (wide screens): today's market prices, a reason to come back daily. One column below xl:
          minmax(0,1fr) keeps long content from stretching the page past the screen on phones. ── */}
      {/* 11 Nov 2026 (client): a richer, premium colour (.hero-premium in globals.css: midnight navy into deep royal blue. The moving lights (HeroParticles) were removed on 12 Nov 2026 at the client's request; the specks stay.
          with soft blue and gold light) and a moving network of lights behind everything (HeroParticles). */}
      {/* Laptops and up (1280px+): the hero is 740px tall (client, 14 Nov 2026; was 690), or the screen's height if that is less, with its content in the middle. */}
      <section className="hero-premium under-header-pad relative isolate overflow-hidden text-white xl:flex xl:min-h-[min(100vh,740px)] xl:flex-col xl:justify-center">
        {/* Measured layout (client spec, Nov 2026): 680px text column, 96px gap, 450px card set 120px lower;
            about 64px above and 72px below (9 Nov 2026); 12–16px between the elements; 48px headline on one line (was 68px). One column below xl. */}
        {/* Updates ribbon across the whole width (managed at /admin/updates), no label. Phones: tighter above and below. */}
        <div className="container-site relative pt-1.5 sm:pt-[40px]">
          <UpdatesMarquee dark updates={updates} live={yt.video?.live ? { title: yt.video.title } : null} />
        </div>
        <div className="container-site relative grid grid-cols-[minmax(0,1fr)] gap-8 pb-10 pt-4 sm:pb-12 sm:pt-6 xl:pb-9 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)] xl:items-start xl:gap-x-12 2xl:grid-cols-[minmax(0,1fr)_minmax(0,450px)] 2xl:gap-x-16">
          <div className="relative flex min-w-0 flex-col items-start">
            {/* The soft light from the section pages (client, 9 Nov 2026): blue shining down from the top onto the
                headline, faded on every side so it blends into the navy. Behind the text, never takes a click. */}
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-[-130px] -z-10 h-[300px] w-[620px] max-w-[160vw] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgba(0,170,255,0.42)_0%,rgba(0,105,255,0.20)_45%,rgba(0,48,130,0.06)_75%,transparent_100%)] blur-[18px] [mask-image:linear-gradient(to_bottom,transparent_0%,#000_35%,#000_70%,transparent_100%)] sm:left-[300px] sm:top-[-140px] sm:h-[340px]" />

            {/* The client's message, word for word: "B2B Information Portal", B2B in orange */}
            {/* One line on every screen: the text is about 13.5× the font size wide, so phones scale with the
                screen (6.2vw: 20px on a 320px phone, 30px at most) and wider screens step up to 40px and 48px. */}
            {/* One line, smaller (client, 14 Nov 2026), ending in an orange full stop. Scales with the screen on phones. */}
            <h1 data-home="" className="text-hero mb-4 whitespace-nowrap text-[clamp(17px,5.4vw,26px)] leading-[1.1] tracking-[-0.03em] text-white sm:text-[30px] lg:text-[32px] xl:text-[36px] 2xl:text-[40px]">
              <span className="sr-only">Bizsphere-UG: </span>
              <span className="text-accent">B2B</span> Information Portal<span className="text-accent">.</span>
            </h1>

            <p data-size="" className="mb-4 max-w-2xl text-[13px] leading-[1.6] text-white/90 sm:text-[14px]">
              Up-to-Date Market Prices, Business Ideas, Trusted Suppliers, Business Machines, Funding Sources, Business Experts, Business Guides, Business Tools and Business News, all in one place.{" "}
              <span className=" text-white">Start exploring now.</span>
            </p>

            <HomeSearch />

            {/* Every directory as a link tile: on phones bigger tiles, two to a row (solid hairline: no dotted borders, client 10 Nov 2026), from sm a quiet hairline tile,
                padded just enough for the twelve to sit in three rows of four on a laptop */}
            <ul aria-label="Directories" className="mt-4 grid w-full max-w-[720px] grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-2 lg:max-w-[820px] lg:gap-2.5">
              {DIRECTORIES.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className="group flex h-full min-h-[56px] w-full items-center gap-2.5 rounded-xl border border-solid border-white/25 bg-white/[0.06] px-3.5 py-3 text-[14px] leading-tight text-white transition-colors hover:border-accent hover:bg-white/10 hover:text-white sm:inline-flex sm:h-auto sm:w-auto sm:min-h-[44px] sm:gap-2 sm:rounded-lg sm:px-3.5 sm:py-2 sm:text-[15px] lg:min-h-[48px] lg:gap-2.5 lg:px-4 lg:py-2.5 lg:text-[15px]">
                    <Icon name={d.icon} className="h-5 w-5 shrink-0 text-accent sm:h-[18px] sm:w-[18px] lg:h-5 lg:w-5" />
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              {/* Get started: down to the next section, "Everything a business needs" (#features), for everyone (client, 9 Nov 2026) */}
              {/* Solid and outlined, bold, small corners (client, 12 Nov 2026, after an example they sent) */}
              <a href="#features" className="inline-flex h-12 items-center justify-center rounded-md bg-accent px-7 font-display text-[14px] font-extrabold text-ink transition-colors hover:bg-[#FFA54A] hover:text-ink">Get started</a>
              <Link href="/prices" className="inline-flex h-12 items-center justify-center rounded-md border-2 border-accent px-7 font-display text-[14px] font-extrabold text-accent transition-colors hover:bg-accent hover:text-ink">Check today&apos;s prices</Link>
            </div>
          </div>

          {/* Right panel: the live stream while we're live on YouTube; otherwise two columns of real photos from the
              site drifting slowly (HeroCollage; client, 12 Nov 2026); with too few photos, today's market prices,
              then the latest video or the bakery example. Wide screens only (1280px+). */}
          <div id="watch" className="hidden scroll-mt-28 flex-col xl:-mt-[16px] xl:flex">
            {!yt.video?.live && photos.length >= 6 ? (
              <HeroCollage photos={photos} />
            ) : !yt.video?.live && prices.rows.length ? (
              <PricePanel {...prices} video={yt.video ? { id: yt.video.id, title: yt.video.title } : null} />
            ) : (
            <div className="w-full rounded-2xl border border-white/15 bg-white/[0.06] p-5">
              <div className="flex items-center gap-3 pb-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-ink"><Icon name="video" className="h-4 w-4" /></span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-display text-[14px] leading-tight tracking-[-0.01em] text-white">
                    {yt.video?.live ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-[#FF0033] px-2 py-0.5 text-[10px] tracking-wider text-white"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-white" />LIVE</span>
                    ) : null}
                    <span className="truncate">{yt.video?.live ? (yt.video.title ?? "We're live on YouTube") : (yt.video?.title ?? "How Bizsphere-Ug works")}</span>
                  </span>
                  <span className="text-[12px] text-white/60">From idea to action in four steps.</span>
                </span>
                {yt.channelId ? (
                  <a href={`https://www.youtube.com/channel/${yt.channelId}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[13px] text-white hover:border-accent hover:bg-accent hover:text-ink">
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

    </div>
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
      <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/80">Example: starting a bakery</span>
      <ol className="relative flex flex-col gap-2">
        {/* The line joining the steps, behind the icon tiles */}
        <span aria-hidden className="absolute bottom-7 left-[30px] top-7 w-px bg-gradient-to-b from-white/30 via-white/15 to-white/30" />
        {steps.map(([href, icon, step, example, badge, tone], n) => (
          <li key={href}>
            <Link href={href} className="group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-navy/60 px-3 py-2.5 text-white transition-colors hover:border-accent/60 hover:bg-navy/80 hover:text-white">
              <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} className="h-4 w-4" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-[0.12em] text-white/50">{n + 1}. {step}</span>
                <span className="truncate font-display text-[14px] leading-tight text-white">{example}</span>
              </span>
              <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/75">{badge}</span>
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
/**
 * Photos for the hero collage: real, published pages that have a photo (business ideas, machines and suppliers'
 * products), mixed so the same kind never sits twice in a row. Names and what each is, nothing member-only.
 */
async function heroPhotos(): Promise<CollagePhoto[]> {
  const live = { publicationStatus: "PUBLISHED" } as const;
  const clean = (t: string) => t.replace(/^Sample:\s*/i, "");
  const [ideas, machines, products] = await Promise.all([
    prisma.contentItem.findMany({ where: { contentType: "BUSINESS_IDEA", ...live, businessIdea: { pictureUrl: { not: null } } }, select: { slug: true, title: true, businessIdea: { select: { pictureUrl: true } } }, orderBy: { publishedAt: { sort: "desc", nulls: "last" } }, take: 5 }),
    prisma.contentItem.findMany({ where: { contentType: "MACHINE", ...live, machine: { pictureUrl: { not: null } } }, select: { slug: true, title: true, machine: { select: { pictureUrl: true } } }, orderBy: { publishedAt: { sort: "desc", nulls: "last" } }, take: 5 }),
    prisma.supplierProductListing.findMany({ where: { status: "PUBLISHED", imageUrl: { not: null }, supplier: { contentItem: live } }, select: { id: true, productName: true, imageUrl: true, supplier: { select: { contentItem: { select: { slug: true, title: true } } } } }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]).catch(() => [[], [], []] as const);
  const a: CollagePhoto[] = ideas.map((i) => ({ src: i.businessIdea!.pictureUrl!, title: clean(i.title), sub: "Business ideas", href: `/business-ideas/${i.slug}`, kind: "idea" }));
  const b: CollagePhoto[] = machines.map((m) => ({ src: m.machine!.pictureUrl!, title: clean(m.title), sub: "Business machines", href: `/machines/${m.slug}`, kind: "machine" }));
  const c: CollagePhoto[] = products.map((p) => ({ src: p.imageUrl!, title: clean(p.productName), sub: clean(p.supplier.contentItem.title), href: `/suppliers/${p.supplier.contentItem.slug}/products/${p.id}`, kind: "product" }));
  const out: CollagePhoto[] = [];
  for (let i = 0; i < 5; i++) for (const list of [a, b, c]) if (list[i]) out.push(list[i]);
  return out.slice(0, 12);
}

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
    <div className="w-full overflow-hidden rounded-2xl border border-white/15 bg-[#081A3C]/75 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <span className="flex flex-col gap-0.5">
          <span className="font-display text-[14px] text-white">Market prices</span>
          <span className="text-[12px] text-white/55">Wholesale · Uganda{updated ? ` · updated ${updated}` : ""}</span>
        </span>
        <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] uppercase tracking-wide text-white/70">Latest</span>
      </div>
      <ul className="divide-y divide-white/10">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/prices?q=${encodeURIComponent(r.name.split(",")[0])}`} className="flex items-center gap-3 px-5 py-3 text-white hover:bg-white/[0.04] hover:text-white">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px]">{r.name}</span>
                {r.unit ? <span className="text-[12px] text-white/50">per {r.unit}</span> : null}
              </span>
              <span className="shrink-0 text-right text-[13px] tabular-nums">{r.price}</span>
              <span className={`inline-flex w-[68px] shrink-0 items-center justify-end gap-1 text-[12px] tabular-nums ${r.change === null || Math.abs(r.change) < 0.05 ? "text-white/45" : r.change > 0 ? "text-[#3DD68C]" : "text-[#FF6B6B]"}`}>
                {r.change !== null && r.change >= 0.05 ? <TrendingUp aria-hidden className="h-3.5 w-3.5" /> : r.change !== null && r.change <= -0.05 ? <TrendingDown aria-hidden className="h-3.5 w-3.5" /> : null}
                {r.change === null ? "–" : `${r.change > 0 ? "+" : ""}${r.change.toFixed(1)}%`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5">
        <Link href="/prices" className="inline-flex items-center gap-1 text-[13px] text-accent hover:text-white">See all prices<ChevronRight aria-hidden className="h-4 w-4" /></Link>
        {video ? (
          <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-white/60 hover:text-white">
            <Icon name="video" className="h-4 w-4 shrink-0" /><span className="truncate">How Bizsphere-Ug works</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}

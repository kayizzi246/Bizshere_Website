import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Coins, FileText, Lightbulb, LockKeyhole, MapPin, Megaphone, MessagesSquare, Percent, Ship, Sprout, Store, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { directory } from "@/config/directories";
import { compactRange, date, itemHref, websiteName } from "@/lib/format";
import { FanTilt } from "./FanTilt";
import { LottieArt } from "./LottieArt";
import { Icon } from "./Icon";
import { IdeaPhoto } from "./IdeaParts";
import { PanelParticles } from "./PanelParticles";

/**
 * The homepage below the hero: what BizSphere-Ug offers. A centred title; Business Ideas as the wide
 * panel in green, words on the left and a fan of photos on the right; Business Machines in navy with the
 * words and photos swapped, so the page swings as it flows; then Funding and Suppliers as two
 * joined panels (Panel below) with real listings in them; then Experts as a plum panel with real experts; then Tools, Business Tips and the
 * Business Forum side by side on white (Card below); Guides and News on a navy band; Market Prices and Useful Websites on
 * white; then the offer: what members get and the prices. The price is also under the
 * title, and join buttons open the sign-up and payment pop-up right here. Members see no selling. Every heading is black, in the heaviest weight, and the words
 * are centred on every screen size.
 *
 * Every idea, programme and supplier shown is a real published record, and only names and places
 * are used, so nothing here is member-only. No invented customers or numbers, and no shadows. Only
 * each block rises gently into place once as it is reached (.rise-soft), the fan takes turns, and the
 * suppliers glide past in a row.
 */
const clean = (title: string) => title.replace(/^Sample:\s*/i, "").replace(/^./, (c) => c.toUpperCase());

async function records() {
  const newest = [{ publishedAt: { sort: "desc", nulls: "last" } }] as const;
  const live = { publicationStatus: "PUBLISHED" } as const;
  const item = { slug: true, title: true, contentType: true, shortSummary: true, publishedAt: true } as const;
  const [ideas, funding, suppliers, machines, guides, news, websites, products, experts] = await Promise.all([
    prisma.contentItem.findMany({ where: { contentType: "BUSINESS_IDEA", ...live }, select: { slug: true, title: true, businessIdea: { select: { pictureUrl: true } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "FUNDING_PROGRAMME", ...live }, select: { slug: true, title: true, fundingProgramme: { select: { fundingType: true, provider: { select: { organization: { select: { legalName: true, tradingName: true } } } } } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "SUPPLIER", ...live }, select: { slug: true, title: true, supplier: { select: { country: true, items: true, pictureUrl: true, listings: { where: { status: "PUBLISHED", imageUrl: { not: null } }, select: { imageUrl: true }, orderBy: { createdAt: "desc" }, take: 1 } } } }, orderBy: [...newest], take: 6 }),
    prisma.contentItem.findMany({ where: { contentType: "MACHINE", ...live, machine: { pictureUrl: { not: null } } }, select: { slug: true, title: true, contentType: true, shortSummary: true, accessLevel: true, machine: { select: { pictureUrl: true, priceMin: true, priceMax: true, currency: true } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "GUIDE", ...live }, select: item, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "NEWS", ...live }, select: item, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "WEBSITE", ...live }, select: { slug: true, title: true, contentType: true, accessLevel: true, website: { select: { siteType: true } } }, orderBy: [...newest], take: 6 }),
    prisma.product.findMany({ where: { observations: { some: { status: "PUBLISHED" } } }, select: { name: true }, orderBy: { name: "asc" }, distinct: ["name"], take: 6 }),
    // Public fields only: name, title, specialties and district. Contacts stay on the member profile.
    prisma.contentItem.findMany({ where: { contentType: "CONSULTANT", ...live }, select: { slug: true, title: true, contentType: true, consultant: { select: { fullName: true, professionalTitle: true, photoUrl: true, specialties: true, district: true } } }, orderBy: [...newest], take: 3 }),
  ]);
  return { ideas, funding, suppliers, machines, guides, news, websites, products, experts };
}

const EXPERT_POINTS: [LucideIcon, string][] = [[Calculator, "Tax"], [BookOpen, "Accounting"], [Ship, "Import and export"], [Sprout, "Farming"]];
/** Websites a visitor who hasn't paid sees in full on the homepage card; the rest are locked. */
const FREE_WEBSITES = 2;
const TOOL_POINTS: [LucideIcon, string][] = [[Percent, "VAT"], [Users, "PAYE"], [FileText, "Business plans"], [TrendingUp, "Cash flow"]];
// The Tools, Tips and Forum cards look alike: an icon, a title, a line and these pills
const TIP_POINTS: [LucideIcon, string][] = [[Coins, "Money"], [Megaphone, "Marketing"], [Users, "Customers"], [Store, "Running a shop"]];
const FORUM_POINTS: [LucideIcon, string][] = [[MessagesSquare, "Ask questions"], [Users, "Meet owners"], [Store, "Find stock"], [Lightbulb, "Share ideas"]];
/**
 * One colour per service, used for everything that service shows here (its panel or button, its label,
 * its chips and its animation), so the colour alone says which service it is. Written out in full so
 * Tailwind keeps every class. `solid`: the colour with readable text on it. `ink`: the colour as text
 * on white. `onColour`: a white button or label sitting on that service's own panel.
 */
const S = {
  ideas: { solid: "bg-[#0F5B3E] text-white hover:text-white", ink: "text-[#0F5B3E]", onColour: "bg-white text-[#0F5B3E] hover:text-[#0F5B3E]" },
  machines: { solid: "bg-navy text-white hover:text-white", ink: "text-navy", onColour: "bg-white text-navy hover:text-navy" },
  funding: { solid: "bg-accent text-ink hover:text-ink", ink: "text-accent-dark", onColour: "bg-white text-accent-dark hover:text-accent-dark" },
  suppliers: { solid: "bg-brand text-white hover:text-white", ink: "text-brand-dark", onColour: "bg-white text-brand-dark hover:text-brand-dark" },
  experts: { solid: "bg-[#4A1D6B] text-white hover:text-white", ink: "text-[#4A1D6B]", onColour: "bg-white text-[#4A1D6B] hover:text-[#4A1D6B]" },
  tools: { solid: "bg-[#0F766E] text-white hover:text-white", ink: "text-[#0F766E]", onColour: "" },
  tips: { solid: "bg-[#BE185D] text-white hover:text-white", ink: "text-[#BE185D]", onColour: "" },
  forum: { solid: "bg-[#EAB308] text-ink hover:text-ink", ink: "text-[#8A6A00]", onColour: "" },
  guides: { solid: "bg-[#4338CA] text-white hover:text-white", ink: "text-[#4338CA]", onColour: "" },
  news: { solid: "bg-[#8B5E1A] text-white hover:text-white", ink: "text-[#8B5E1A]", onColour: "" },
  prices: { solid: "bg-[#C8102E] text-white hover:text-white", ink: "text-[#C8102E]", onColour: "" },
  websites: { solid: "bg-[#475467] text-white hover:text-white", ink: "text-[#475467]", onColour: "" },
} as const;
const PLUM = "bg-[#4A1D6B]";

// The tag on each funding row: what kind of money it is, at a glance.
const FUND_TAG: Record<string, string> = { LOAN: "bg-brand-tint text-brand-dark", GRANT: "bg-[#E6F4EC] text-[#1F7A4D]", EQUITY: "bg-accent-tint text-accent-dark" };

// A supplier with no photo yet gets a bold initial, in shades of the Suppliers blue.
const MONOGRAM = ["bg-brand-dark text-white", "bg-brand-tint text-brand-dark", "bg-navy text-white", "bg-[#D6E9F7] text-brand-dark"];

/**
 * "What do you need today?": the visitor's own problem in their own words, each one straight to the part of
 * the site that solves it. [what they say, where it goes, that service's colour]
 */
const NEEDS: [string, string, string][] = [
  ["I want to start a business", "/business-ideas", S.ideas.solid],
  ["I need money for my business", "/funding", S.funding.solid],
  ["I am looking for a supplier", "/suppliers", S.suppliers.solid],
  ["I need a machine", "/machines", S.machines.solid],
  ["I need advice from an expert", "/experts", S.experts.solid],
  ["I want today's market prices", "/prices", S.prices.solid],
];

/** Good morning / afternoon / evening by the clock in Uganda, where the visitors are. */
function greeting(name: string | null) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Kampala" }).format(new Date()));
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(/s+/)[0];
  return first ? `${part}, ${first}` : part;
}

/** Opens the sign-up and payment pop-up here on the homepage (data-pay, src/components/Onboarding.tsx), for someone signed in who has not paid yet. */

const heading = "text-hero text-[22px] leading-[1.2] text-black sm:text-[26px] lg:text-[30px]";
const body = "mx-auto max-w-md text-[16px] leading-relaxed text-ink-soft sm:text-[17px]";
/** Homepage type scale: section titles 28/36/40px, panel titles 24/28/32px, card titles (these) 20/22/24px. */
const cardHeading = "text-hero text-[20px] leading-[1.2] text-black sm:text-[22px] lg:text-[24px]";

const Label = ({ href, pill }: { href: string; pill: string }) => {
  const d = directory(href);
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold ${pill}`}><Icon name={d.icon} className="h-4 w-4" />{d.title}</span>;
};

const Go = ({ href, tone = "bg-brand text-white hover:bg-brand-dark hover:text-white", children }: { href: string; tone?: string; children: React.ReactNode }) => (
  <Link href={href} className={`go-btn group mt-1 inline-flex h-12 items-center gap-1.5 rounded-full px-6 text-[15px] font-bold ${tone}`}>
    {children}<ArrowRight aria-hidden className="go-arrow h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
  </Link>
);

/**
 * One part: name, heading, sentence, what it holds and a button at the bottom, so two side by side line up.
 */
function Card({ href, title, text, action, colour, dark = false, art, children }: { href: string; title: string; text: string; action: string; colour: string; dark?: boolean; art?: string; children: React.ReactNode }) {
  return (
    <li data-reveal="" className="rise-soft">
      <div className="flex h-full flex-col items-center gap-3 text-center">
        {art ? <LottieArt src={art} className="h-24 w-24" /> : null}
        <Label href={href} pill={colour} />
        <h3 className={dark ? "text-hero text-[20px] leading-[1.2] text-white sm:text-[22px] lg:text-[24px]" : cardHeading}>{title}</h3>
        <p className={`mx-auto max-w-lg text-[15px] leading-relaxed sm:text-[16px] ${dark ? "text-white" : "text-ink-soft"}`}>{text}</p>
        <div className="w-full flex-1">{children}</div>
        <span className="mt-auto pt-1"><Go href={href} tone={colour}>{action}</Go></span>
      </div>
    </li>
  );
}

/** A panel in a full brand colour, joined to the one beside it: the words at the top and real listings under them, with its button at the bottom so two side by side line up. */
function Panel({ href, title, text, action, tint, words, onColour, children }: { href: string; title: string; text: string; action: string; tint: string; words: string; onColour: string; children: React.ReactNode }) {
  return (
    <li data-reveal="" className={`rise-soft flex flex-col gap-3 p-5 sm:p-6 ${tint}`}>
      <div className={`flex flex-col items-start gap-2 ${words}`}>
        <Label href={href} pill={onColour} />
        <h3 className="text-hero text-[24px] leading-[1.2] sm:text-[28px] md:text-[24px] lg:text-[28px] xl:text-[32px]">{title}</h3>
        <p data-size="" className="max-w-lg text-[14px] font-medium leading-relaxed sm:text-[15px]">{text}</p>
      </div>
      <div className="flex-1">{children}</div>
      <span><Go href={href} tone={onColour}>{action}</Go></span>
    </li>
  );
}

const Points = ({ points, mark, tint, start = false }: { points: [LucideIcon, string][]; mark: string; tint: string; start?: boolean }) => (
  <ul className={`flex flex-wrap gap-2 ${start ? "justify-start" : "justify-center"}`}>
    {points.map(([Glyph, label]) => (
      <li key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${tint}`}><Glyph aria-hidden className={`h-4 w-4 ${mark}`} strokeWidth={1.75} />{label}</li>
    ))}
  </ul>
);

/** Plain rows of reading: a name, a line under it, a hairline between, centred under the card's title. No background of their own. */
const Reading = ({ items, note }: { items: { slug: string; title: string; contentType: string; shortSummary: string | null; publishedAt: Date | null }[]; note?: boolean }) => (
  <ul className="mx-auto flex w-full max-w-xl flex-col divide-y divide-white/20 text-center">
    {items.map((r, n) => (
      <li key={r.slug} data-reveal="" style={{ "--d": `${n * 60}ms` } as React.CSSProperties}>
        <Link href={itemHref(r)} className="group flex flex-col items-center gap-0.5 py-3 text-white hover:text-white">
          {note && r.publishedAt ? <span className="text-[12px] font-semibold text-white/70">{date(r.publishedAt)}</span> : null}
          <span className="font-display text-[16px] font-extrabold leading-snug decoration-2 underline-offset-4 group-hover:underline">{clean(r.title)}</span>
          {r.shortSummary ? <span className="line-clamp-1 text-[14px] text-white/85">{r.shortSummary}</span> : null}
        </Link>
      </li>
    ))}
  </ul>
);

export async function HomeFeatures() {
  const [{ ideas, funding, suppliers, machines, guides, news, websites, products, experts }, viewer] = await Promise.all([records(), getViewer()]);
  const sell = !viewer.isMember && !viewer.isStaff;
  // The newest idea sits in the middle of the fan, on top
  const fan = ideas.length === 3 ? [ideas[1], ideas[0], ideas[2]] : ideas;
  // Get started in the hero scrolls to #features. The smooth scroll already leaves 96px for the header
  // (SmoothScroll), which slides away going down: -72px lands the section near the top.
  return (
    <section id="features" className="-scroll-mt-[72px] overflow-x-clip bg-white">
      {/* A greeting and the visitor's problem first: one tap from "I need…" to the answer (client, 10 Nov 2026) */}
      <div className="container-site flex flex-col items-center gap-6 pt-10 sm:gap-8 sm:pt-14">
        <div data-reveal="" className="rise-soft flex flex-col items-center gap-3 text-center">
          <span className="rounded-full bg-page px-3 py-1 text-[14px] font-bold text-ink-soft">{greeting(viewer.name)}</span>
          <h2 className="text-hero text-[28px] leading-[1.15] text-black sm:text-[36px] lg:text-[40px]">What do you need today?</h2>
          <p className={body}>Choose one and we take you straight there.</p>
        </div>
        <ul className="grid w-full max-w-[1000px] grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NEEDS.map(([say, href, colour]) => (
            <li key={href}>
              <Link href={href} className="group flex min-h-[68px] items-center gap-3 bg-page p-3 pr-4 text-ink transition-colors hover:bg-brand-tint hover:text-ink">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center ${colour}`}><Icon name={directory(href).icon} className="h-5 w-5" /></span>
                <span className="flex-1 font-display text-[16px] font-bold leading-snug">{say}</span>
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-1 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-center text-[15px] text-ink-soft">Not sure where to start? <Link href="/contact" className="font-bold">Tell us what you need</Link> and a person will help you.</p>
      </div>

      <div className="container-site flex flex-col items-center gap-3 pt-12 text-center sm:pt-16">
        <h2 className="text-hero text-[28px] leading-[1.15] text-black sm:text-[36px] lg:text-[40px]">Everything a business needs</h2>
      </div>

      {/* Business Ideas: a panel like the machines below it, in green, a colour no other panel uses */}
      <div className="container-site pb-4 pt-8 sm:pb-5 sm:pt-10">
      <div data-ideas="" data-reveal="" data-reveal-late="" className={`relative grid grid-cols-[minmax(0,1fr)] items-center gap-6 overflow-hidden bg-[#0F5B3E] p-5 sm:p-8 ${fan.length ? "lg:grid-cols-2 lg:gap-10" : ""}`}>
        <PanelParticles />
        <div data-reveal="" className="relative flex flex-col items-start gap-4">
          <Label href="/business-ideas" pill={S.ideas.onColour} />
          <h3 className="text-hero text-[24px] leading-[1.2] text-white sm:text-[28px] lg:text-[32px]">Business plans with the real costs</h3>
          <p className="max-w-md text-[16px] leading-relaxed text-white sm:text-[17px]">Ready plans with every cost, line by line.</p>
          <Go href="/business-ideas" tone={S.ideas.onColour}>See business ideas</Go>
        </div>
        {fan.length ? (
          <FanTilt>
            {fan.map((idea, i) => {
              const n = fan.length === 1 ? 0 : i - (fan.length - 1) / 2;
              return (
                <div key={idea.slug} style={{ "--n": n, zIndex: n === 0 ? 2 : 1 } as React.CSSProperties}
                  className="fan-card flex flex-col overflow-hidden rounded-3xl bg-white text-heading ring-1 ring-line">
                  <IdeaPhoto src={idea.businessIdea?.pictureUrl} alt="" className="aspect-[4/3]" />
                  <span className="truncate px-4 py-3 font-display text-[14px] font-bold sm:text-[16px]">{clean(idea.title)}</span>
                </div>
              );
            })}
          </FanTilt>
        ) : null}
      </div>
      </div>

      {/* Business Machines, Funding and Suppliers: one joined block. Machines sit on top, photos on the left. */}
      <div className="container-site">
      <div data-machines="" data-reveal="" className={`rise-soft relative grid grid-cols-[minmax(0,1fr)] items-center gap-6 overflow-hidden bg-navy p-5 sm:p-8 ${machines.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
        <PanelParticles />
        <div data-reveal="" className="relative flex flex-col items-start gap-4">
          <Label href="/machines" pill={S.machines.onColour} />
          <h3 className="text-hero text-[24px] leading-[1.2] text-white sm:text-[28px] lg:text-[32px]">The right machine for the job</h3>
          <p className="max-w-md text-[16px] leading-relaxed text-white sm:text-[17px]">What each machine does and costs.</p>
          <Go href="/machines" tone={S.machines.onColour}>See business machines</Go>
        </div>
        {machines.length ? (
          <div className="relative flex flex-col gap-2.5 rounded-3xl bg-[#14305A] p-3 sm:p-4">
            {machines.map((m, n) => {
              const x = m.machine;
              const hasPrice = x && (x.priceMin !== null || x.priceMax !== null);
              const locked = m.accessLevel !== "PUBLIC" && !viewer.isMember;
              return (
                <Link key={m.slug} data-reveal="" style={{ "--d": `${n * 90}ms` } as React.CSSProperties} href={itemHref(m)} className="group flex items-center gap-3 rounded-2xl bg-navy p-2.5 text-white transition-colors hover:bg-black hover:text-white sm:gap-4 sm:p-3">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-page sm:h-20 sm:w-20">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                    <img src={x?.pictureUrl ?? ""} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  </span>
                  {/* Phones: the price under the name, so the name has the whole width */}
                  <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-[15px] font-extrabold leading-tight sm:text-[16px]">{clean(m.title)}</span>
                    {m.shortSummary ? <span className="line-clamp-1 text-[12px] text-white/85 sm:text-[13px]">{m.shortSummary}</span> : null}
                  </span>
                  {hasPrice ? (locked
                    ? <span className="flex shrink-0 items-center gap-1.5 text-white/80"><span aria-hidden className="select-none text-hero text-[15px] text-white blur-[6px] sm:text-[18px]">UGX 0.0M</span><LockKeyhole aria-hidden className="h-4 w-4" /></span>
                    : <span className="shrink-0 text-hero text-[15px] leading-tight sm:text-right sm:text-[18px]">{compactRange(x.priceMin, x.priceMax, x.currency)}</span>) : null}
                  </span>
                </Link>
              );
            })}
            {!viewer.isMember ? (
              <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[14px] font-semibold text-heading">
                <span className="inline-flex items-center gap-2"><LockKeyhole aria-hidden className="h-4 w-4 text-navy" />Prices and where to buy</span>
                <span className="rounded-lg bg-navy px-2.5 py-1 text-[13px] font-bold text-white">For members</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
        <ul data-panels="" className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:mt-5 sm:gap-5 md:grid-cols-2">
          <Panel href="/funding" title="Every funding source in one list" action="See funding sources" tint="bg-accent" words="text-ink" onColour={S.funding.onColour}
            text="Banks, government and other lenders.">
            <ul className="flex h-full flex-col gap-2">
              {funding.map((f, n) => {
                const org = f.fundingProgramme?.provider.organization;
                const type = f.fundingProgramme?.fundingType;
                return (
                  <li key={f.slug} data-reveal="" style={{ "--d": `${n * 70}ms` } as React.CSSProperties} className="flex-1">
                    <Link href={`/funding/${f.slug}`} className="group flex h-full items-center gap-3 rounded-2xl bg-white px-3 py-2 text-heading hover:text-heading">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-dark"><Icon name="funding" className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-display text-[14px] font-bold group-hover:text-accent-dark">{clean(f.title)}</span>
                        {org ? <span className="truncate text-[12px] text-ink-muted">{clean(org.tradingName ?? org.legalName)}</span> : null}
                      </span>
                      {type ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${FUND_TAG[type] ?? "bg-page text-ink-soft"}`}>{type.charAt(0) + type.slice(1).toLowerCase()}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel href="/suppliers" title="A directory of checked suppliers" action="See all suppliers" tint="bg-brand" words="text-white" onColour={S.suppliers.onColour}
            text="Checked suppliers in Uganda and abroad.">
            {/* Six suppliers, still: two columns of white rows like the funding list beside it (four on phones) */}
            <ul className="grid h-full grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              {suppliers.slice(0, 6).map((x, n) => {
                const picture = x.supplier?.listings[0]?.imageUrl || x.supplier?.pictureUrl;
                const name = clean(x.title);
                const sells = x.supplier?.items.slice(0, 2).join(", ");
                return (
                  <li key={x.slug} data-reveal="" style={{ "--d": `${n * 60}ms` } as React.CSSProperties} className={n >= 4 ? "hidden sm:block" : undefined}>
                    <Link href={`/suppliers/${x.slug}`} className="group flex h-full items-center gap-3 rounded-2xl bg-white p-2.5 text-heading hover:text-heading">
                      <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl ${picture ? "bg-page" : MONOGRAM[n % MONOGRAM.length]}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
                        {picture ? <img src={picture} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <span aria-hidden className="font-display text-[22px] font-extrabold leading-none">{name.charAt(0)}</span>}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-display text-[14px] font-bold group-hover:text-brand">{name}</span>
                        {sells ? <span className="truncate text-[12px] text-ink-soft">{sells}</span> : null}
                        {x.supplier?.country ? <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted"><MapPin aria-hidden className="h-3 w-3 shrink-0" />{x.supplier.country}</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </ul>
      </div>

      {/* Business Experts: a panel of its own, in plum, with real experts (public details only) */}
      <div className="container-site pt-4 sm:pt-5">
      <div data-experts="" data-reveal="" className={`rise-soft relative grid grid-cols-[minmax(0,1fr)] items-center gap-6 overflow-hidden ${PLUM} p-5 sm:p-8 ${experts.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
        <PanelParticles />
        <div data-reveal="" className="relative flex flex-col items-start gap-4">
          <Label href="/experts" pill={S.experts.onColour} />
          <h3 className="text-hero text-[24px] leading-[1.2] text-white sm:text-[28px] lg:text-[32px]">Advice from people who know</h3>
          <p className="max-w-md text-[16px] leading-relaxed text-white sm:text-[17px]">Checked advisors for the hard parts.</p>
          <Points points={EXPERT_POINTS} mark="text-white" tint="bg-white/10 text-white" start />
          <Go href="/experts" tone={S.experts.onColour}>Find an expert</Go>
        </div>
        {experts.length ? (
          <div className="relative flex flex-col gap-2.5 rounded-3xl bg-[#5E2A85] p-3 sm:p-4">
            {experts.map((e, n) => {
              const c = e.consultant;
              const name = clean(c?.fullName || e.title);
              const role = [c?.professionalTitle, c?.specialties.slice(0, 2).join(", ")].filter(Boolean).join(" · ");
              return (
                <Link key={e.slug} data-reveal="" style={{ "--d": `${n * 90}ms` } as React.CSSProperties} href={itemHref(e)} className={`group flex items-center gap-3 rounded-2xl ${PLUM} p-2.5 text-white transition-colors hover:bg-black hover:text-white sm:gap-4`}>
                  <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white font-display text-[24px] font-extrabold text-[#4A1D6B] sm:h-20 sm:w-20">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                    {c?.photoUrl ? <img src={c.photoUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : name.charAt(0)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-display text-[16px] font-extrabold leading-tight sm:text-[19px]">{name}</span>
                    {role ? <span className="line-clamp-1 text-[13px] text-white/85 sm:text-[14px]">{role}</span> : null}
                    {c?.district ? <span className="flex items-center gap-1 text-[12px] text-white/70"><MapPin aria-hidden className="h-3.5 w-3.5" />{c.district}</span> : null}
                  </span>
                  <ArrowRight aria-hidden className="mr-1 h-5 w-5 shrink-0 text-white transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
      </div>

      {/* Tools, and the two newest services: Business Tips and the Business Forum */}
      <div className="container-site py-8 sm:py-12">
        <ul className="grid gap-10 md:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-10">
      <Card href="/tools" art="/lottie/tools.json" title="Your numbers, done in minutes" action="Open the tools" colour={S.tools.solid}
        text="Ready calculators and templates.">
        <Points points={TOOL_POINTS} mark="text-white" tint={S.tools.solid} />
      </Card>

      <Card href="/tips" art="/lottie/tips.json" title="Tips that save you money" action="Read the tips" colour={S.tips.solid}
        text="Short tips that work, with members' remarks.">
        <Points points={TIP_POINTS} mark="text-white" tint={S.tips.solid} />
      </Card>

      <Card href="/forum" art="/lottie/forum.json" title="Talk to other owners" action="Join the conversation" colour={S.forum.solid}
        text="Ask, answer and meet other owners.">
        <Points points={FORUM_POINTS} mark="text-ink" tint={S.forum.solid} />
      </Card>
        </ul>
      </div>

      {/* Learn and keep up: on navy */}
      <div data-reading="" className="bg-navy">
      <div className="container-site py-8 sm:py-12">
        <ul className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
          <Card dark href="/guides" title="Step-by-step help" action="See all guides" colour={S.guides.solid} text="Registration, licences, EFRIS and tax.">
            <Reading items={guides} />
          </Card>
          <Card dark href="/news" title="Know what is changing" action="Read the news" colour={S.news.solid} text="What is new for business in Uganda.">
            <Reading items={news} note />
          </Card>
        </ul>
      </div>
      </div>

      <div className="container-site py-8 sm:py-12">
        <ul className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
          <Card href="/prices" title="What things cost today" action="Check market prices" colour={S.prices.solid} text="Today's prices, market by market.">
            <ul className="flex flex-wrap justify-center gap-2">
              {products.map((x) => <li key={x.name} className="rounded-full bg-[#FDE8EB] px-3 py-1.5 text-[13px] font-semibold text-[#C8102E]">{x.name}</li>)}
            </ul>
          </Card>
          <Card href="/websites" title="The websites you will need" action="See useful websites" colour={S.websites.solid} text="Government and business sites in one list.">
            {/* Pills, the same as the market prices card above (client, 9 Nov 2026). A visitor who hasn't paid
                sees the first two and one pill for the rest, which opens the join and payment pop-up; the
                other names are never sent. */}
            <ul className="flex flex-wrap justify-center gap-2">
              {(sell ? websites.slice(0, FREE_WEBSITES) : websites).map((w) => (
                <li key={w.slug}><Link href={itemHref(w)} className="inline-flex rounded-full bg-[#EEF0F3] px-3 py-1.5 text-[13px] font-semibold text-[#475467] hover:bg-[#475467] hover:text-white">{websiteName(w.title, { hideAddress: w.accessLevel !== "PUBLIC" && sell, siteType: w.website?.siteType })}</Link></li>
              ))}
              {sell && websites.length > FREE_WEBSITES ? (
                <li><Link href="/membership?onboard=pay&next=%2Fwebsites" data-pay="" data-next="/websites" className="inline-flex items-center gap-1.5 rounded-full bg-[#475467] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-navy hover:text-white"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />{websites.length - FREE_WEBSITES} more for members</Link></li>
              ) : null}
            </ul>
          </Card>
        </ul>
      </div>

      {/* ── For businesses: be found by the buyers who come here. Suppliers and experts pay for a listing;
          this is the site's other income, so it gets a block of its own, not a footer link. ── */}
      {/* In the page's own language: a centred black title like the sections above, then two flat,
          square-cornered panels side by side in the Funding (orange) and Suppliers (blue) colours,
          each with what you get and one button. No new colour, no rounded box, no dark band twice in a row. */}
      {!viewer.isStaff ? (
        <div className="container-site flex flex-col gap-6 pb-10 pt-2 sm:gap-8 sm:pb-14">
          <div data-reveal="" className="rise-soft flex flex-col items-center gap-3 text-center">
            <span className="rounded-full bg-page px-3 py-1 text-[13px] font-bold text-ink-soft">For businesses</span>
            <h2 className={heading}>Get your business in front of buyers</h2>
            <p className={body}>Business owners come here every day to find who sells what and who can help. Be the one they find.</p>
          </div>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 md:grid-cols-2">
            {([
              ["/suppliers/join", "supplier", "Trusted Suppliers", "Become a Supplier", "For shops, wholesalers, manufacturers, importers and machine dealers.", ["Your own page with your photo and products", "Buyers call you directly", "A dashboard to update it yourself"], "bg-accent text-ink", S.funding.onColour, "bg-white/40"],
              ["/experts/join", "expert", "Business Experts", "Become an Expert", "For accountants, tax advisors, consultants, trainers and other professionals.", ["Your own profile with your services", "The jobs you have done, shown with photos", "Clients call or WhatsApp you directly"], "bg-brand text-white", S.suppliers.onColour, "bg-white/15"],
            ] as const).map(([href, icon, kind, title, text, gets, tint, onColour, check], n) => (
              <li key={href} data-reveal="" style={{ "--d": `${n * 90}ms` } as React.CSSProperties} className={`rise-soft flex flex-col gap-4 p-5 sm:p-6 lg:p-8 ${tint}`}>
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold ${onColour}`}><Icon name={icon} className="h-4 w-4" />{kind}</span>
                <h3 className="text-hero text-[24px] leading-[1.2] sm:text-[28px] lg:text-[32px]">{title}</h3>
                <p className="max-w-md text-[15px] font-medium leading-relaxed sm:text-[16px]">{text}</p>
                <ul className="flex flex-1 flex-col gap-2">
                  {gets.map((g) => (
                    <li key={g} className="flex items-center gap-2.5 text-[14px] font-semibold sm:text-[15px]">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${check}`}><Icon name="check" className="h-3.5 w-3.5" /></span>{g}
                    </li>
                  ))}
                </ul>
                <span><Go href={href} tone={onColour}>{title}</Go></span>
              </li>
            ))}
          </ul>
          <p className="text-center text-[14px] text-ink-soft">Prefer to talk first? <Link href="/contact?about=supplier_listing" className="font-bold">Leave your number</Link> and we call you back.</p>
        </div>
      ) : null}

    </section>
  );
}

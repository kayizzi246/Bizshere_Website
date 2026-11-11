import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Coins, FileText, Lightbulb, LockKeyhole, MapPin, Megaphone, MessagesSquare, Percent, Plus, Ship, Sprout, Store, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { directory } from "@/config/directories";
import { compactRange, date, itemHref, websiteName } from "@/lib/format";
import { LottieArt } from "./LottieArt";
import { Icon } from "./Icon";
import { IdeaPhoto } from "./IdeaParts";

/**
 * The homepage below the hero: what BizSphere-Ug offers. A centred title; Business Ideas as the wide
 * panel in green, words on top and the newest plans as photo cards under them; Business Machines in navy with the
 * words and photos swapped, so the page swings as it flows; then Funding and Suppliers as two
 * joined panels (Panel below) with real listings in them; then Experts as a plum panel with real experts; then Tools, Business Tips and the
 * Business Forum, Guides, News, Market Prices and Useful Websites as white cards on one light band (Tile below); then on
 * white; then the offer: what members get and the prices. The price is also under the
 * title, and join buttons open the sign-up and payment pop-up right here. Members see no selling. Every heading is black, in the heaviest weight, and the words
 * are centred on every screen size.
 *
 * Every idea, programme and supplier shown is a real published record, and only names and places
 * are used, so nothing here is member-only. No invented customers or numbers, and no shadows. Only
 * each block rises gently into place once as it is reached (.rise-soft), and the
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
 * on white. `onColour`: a white button or label sitting on that service's own panel. `soft`: a light tint of
 * the colour with the colour as text (chips, icon tiles); `softBtn`: the same as a button that fills on hover.
 */
const S = {
  ideas: { solid: "bg-[#0F5B3E] text-white hover:text-white", ink: "text-[#0F5B3E]", onColour: "bg-white text-[#0F5B3E] hover:text-[#0F5B3E]" },
  machines: { solid: "bg-navy text-white hover:text-white", ink: "text-navy", onColour: "bg-white text-navy hover:text-navy" },
  funding: { solid: "bg-accent text-ink hover:text-ink", ink: "text-accent-dark", onColour: "bg-white text-accent-dark hover:text-accent-dark" },
  suppliers: { solid: "bg-brand text-white hover:text-white", ink: "text-brand-dark", onColour: "bg-white text-brand-dark hover:text-brand-dark" },
  experts: { solid: "bg-[#4A1D6B] text-white hover:text-white", ink: "text-[#4A1D6B]", onColour: "bg-white text-[#4A1D6B] hover:text-[#4A1D6B]" },
  tools: { solid: "bg-[#0F766E] text-white hover:text-white", ink: "text-[#0F766E]", onColour: "", soft: "bg-[#E4F3F1] text-[#0F766E]", softBtn: "bg-[#E4F3F1] text-[#0F766E] hover:bg-[#0F766E] hover:text-white" },
  tips: { solid: "bg-[#BE185D] text-white hover:text-white", ink: "text-[#BE185D]", onColour: "", soft: "bg-[#FCE8F1] text-[#BE185D]", softBtn: "bg-[#FCE8F1] text-[#BE185D] hover:bg-[#BE185D] hover:text-white" },
  forum: { solid: "bg-[#EAB308] text-ink hover:text-ink", ink: "text-[#8A6A00]", onColour: "", soft: "bg-[#FDF3D0] text-[#8A6A00]", softBtn: "bg-[#FDF3D0] text-[#8A6A00] hover:bg-[#8A6A00] hover:text-white" },
  guides: { solid: "bg-[#4338CA] text-white hover:text-white", ink: "text-[#4338CA]", onColour: "", soft: "bg-[#ECEBFB] text-[#4338CA]", softBtn: "bg-[#ECEBFB] text-[#4338CA] hover:bg-[#4338CA] hover:text-white" },
  news: { solid: "bg-[#8B5E1A] text-white hover:text-white", ink: "text-[#8B5E1A]", onColour: "", soft: "bg-[#F6EEDF] text-[#8B5E1A]", softBtn: "bg-[#F6EEDF] text-[#8B5E1A] hover:bg-[#8B5E1A] hover:text-white" },
  prices: { solid: "bg-[#C8102E] text-white hover:text-white", ink: "text-[#C8102E]", onColour: "", soft: "bg-[#FDE8EB] text-[#C8102E]", softBtn: "bg-[#FDE8EB] text-[#C8102E] hover:bg-[#C8102E] hover:text-white" },
  websites: { solid: "bg-[#475467] text-white hover:text-white", ink: "text-[#475467]", onColour: "", soft: "bg-[#EDF0F4] text-[#475467]", softBtn: "bg-[#EDF0F4] text-[#475467] hover:bg-[#475467] hover:text-white" },
} as const;
const PLUM = "bg-[#4A1D6B]";
/**
 * Each homepage section sits on its own band, edge to edge, so the sections read as separate rooms (client,
 * 11 Nov 2026). The lower three are calm neutrals, light grey, white, light grey (the mint, lavender and sand
 * were hard on the eyes, client, same day); cards have a hairline edge so they still stand out on white.
 */
const BAND = { need: "bg-[#EAF4FB]", all: "bg-[#F1F4F8]", everyday: "bg-[#F7F8FA]", know: "bg-white", join: "bg-[#F7F8FA]" } as const;
/** Every colour box on the homepage is this tall on a computer (client, 11 Nov 2026); phones stack and take the room they need. */
const PANEL_H = "lg:h-[445px] xl:h-[410px]"; // small laptops need the extra room: the panel titles wrap there

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
const body = "mx-auto max-w-md text-[14px] leading-relaxed text-ink-soft sm:text-[15px]";
/** Homepage type scale: section titles 28/36/40px, panel titles 24/28/32px, card titles (these) 20/22/24px. Headings keep these sizes; all other text was made one step smaller (reading text 14 to 15px) on 11 Nov 2026 (client). data-size on a paragraph keeps it from the 16px rule in globals.css. */
const cardHeading = "text-hero text-[20px] leading-[1.2] text-black sm:text-[22px] lg:text-[24px]";

const Label = ({ href, pill }: { href: string; pill: string }) => {
  const d = directory(href);
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[13px] ${pill}`}><Icon name={d.icon} className="h-4 w-4" />{d.title}</span>;
};

const Go = ({ href, tone = "bg-brand text-white hover:bg-brand-dark hover:text-white", children }: { href: string; tone?: string; children: React.ReactNode }) => (
  <Link href={href} className={`go-btn group mt-1 inline-flex h-12 items-center gap-1.5 rounded-full px-6 text-[14px] ${tone}`}>
    {children}<ArrowRight aria-hidden className="go-arrow h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
  </Link>
);

/**
 * One everyday service as a soft white card with rounded corners (client, 11 Nov 2026: premium, not dark):
 * its icon on a light tint of its colour, its name in that colour, a heading that says what the visitor
 * gets, one sentence, what is inside, and one quiet button at the bottom so cards side by side line up.
 * No solid dark blocks: the colour is in the tints and the text.
 */
function Tile({ href, title, text, action, soft, softBtn, ink, art, children }: { href: string; title: string; text: string; action: string; soft: string; softBtn: string; ink: string; art?: string; children: React.ReactNode }) {
  const d = directory(href);
  return (
    <li data-reveal="" className="rise-soft flex flex-col items-start gap-3 rounded-3xl border border-line bg-white p-5 transition-transform duration-200 motion-safe:hover:-translate-y-1 sm:p-6">
      <div className="flex w-full items-center justify-between gap-3">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${soft}`}><Icon name={d.icon} className="h-6 w-6" strokeWidth={1.75} /></span>
        {art ? <LottieArt src={art} className="-my-2 h-14 w-14 shrink-0" /> : null}
      </div>
      <span className={`pt-1 text-[13px] uppercase tracking-[0.08em] ${ink}`}>{d.title}</span>
      <h3 className={cardHeading}>{title}</h3>
      <p data-size="" className="text-[14px] leading-relaxed text-ink-soft">{text}</p>
      <div className="w-full flex-1">{children}</div>
      <Go href={href} tone={softBtn}>{action}</Go>
    </li>
  );
}

/** A panel in a full brand colour, joined to the one beside it: the words at the top and real listings under them, with its button at the bottom so two side by side line up. */
function Panel({ href, title, text, action, tint, words, onColour, children }: { href: string; title: string; text: string; action: string; tint: string; words: string; onColour: string; children: React.ReactNode }) {
  return (
    <li data-reveal="" className={`rise-soft relative isolate flex flex-col gap-3 overflow-hidden rounded-[28px] p-5 sm:p-6 xl:py-5 ${PANEL_H} ${tint}`}>
      <Icon name={directory(href).icon} aria-hidden className="pointer-events-none absolute -right-8 -top-10 -z-10 h-48 w-48 text-white/[0.12]" strokeWidth={1} />
      <div className={`flex flex-col items-start gap-2 ${words}`}>
        <Label href={href} pill={onColour} />
        <h3 className="text-hero text-[24px] leading-[1.2] sm:text-[28px] md:text-[24px] lg:text-[28px] xl:text-[32px]">{title}</h3>
        <p data-size="" className="max-w-lg text-[13px] leading-relaxed sm:text-[13px]">{text}</p>
      </div>
      {/* min-h-0: the list gives way before the button does, so the button is never pushed out of the panel */}
      <div className="min-h-0 flex-1">{children}</div>
      <span className="shrink-0"><Go href={href} tone={onColour}>{action}</Go></span>
    </li>
  );
}

const Points = ({ points, mark, tint, start = false }: { points: [LucideIcon, string][]; mark: string; tint: string; start?: boolean }) => (
  <ul className={`flex flex-wrap gap-2 ${start ? "justify-start" : "justify-center"}`}>
    {points.map(([Glyph, label]) => (
      <li key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] ${tint}`}><Glyph aria-hidden className={`h-4 w-4 ${mark}`} strokeWidth={1.75} />{label}</li>
    ))}
  </ul>
);

/** Pages to read, as cards side by side inside an open row (More): date, name, two lines and "Read". Each opens its page. */
const Reading = ({ items, note }: { items: { slug: string; title: string; contentType: string; shortSummary: string | null; publishedAt: Date | null }[]; note?: boolean }) => (
  <ul className="grid w-full grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
    {items.map((r) => (
      <li key={r.slug}>
        <Link href={itemHref(r)} className="group flex h-full flex-col gap-1.5 rounded-2xl bg-page p-4 text-ink transition-colors hover:bg-brand-tint hover:text-ink sm:p-5">
          {note && r.publishedAt ? <span className="text-[13px] text-ink-muted">{date(r.publishedAt)}</span> : null}
          <span className="font-display text-[14px] leading-snug text-black">{clean(r.title)}</span>
          {r.shortSummary ? <span className="line-clamp-2 text-[13px] leading-snug text-ink-soft">{r.shortSummary}</span> : null}
          <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[13px] text-brand-dark">Read<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" /></span>
        </Link>
      </li>
    ))}
  </ul>
);

/**
 * One service as a row that folds open (client, 10 Nov 2026, after a list he liked): its icon on a light tint
 * of its colour, its name as the heading in that colour, one sentence in plain grey text, and a plus that
 * turns to a cross. Open, it shows what is inside and one button. The rows share a name, so opening one
 * closes the others where the browser supports it; it works without JavaScript. Made lighter on 11 Nov 2026
 * (client: premium, not dark): no solid colour squares and no heavy black sentence.
 */
function More({ href, line, action, soft, softBtn, open, children }: { href: string; line: string; action: string; soft: string; softBtn: string; open?: boolean; children: React.ReactNode }) {
  const d = directory(href);
  return (
    <details name="home-more" open={open} className="group/more border-t border-line first:border-t-0 [&>summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-page sm:gap-4 sm:px-6 sm:py-5 group-open/more:hover:bg-white">
        <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${soft}`}><Icon name={d.icon} className="h-5 w-5" strokeWidth={1.75} /></span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <h3 className={`text-hero shrink-0 bg-transparent text-[16px] leading-snug sm:text-[18px] ${soft.split(" ")[1]}`}>{d.title}</h3>
          <span className="text-[14px] leading-snug text-ink-soft">{line}</span>
        </span>
        <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${soft}`}><Plus className="h-4 w-4 transition-transform duration-200 group-open/more:rotate-45 motion-reduce:transition-none" strokeWidth={2.25} /></span>
      </summary>
      <div className="flex flex-col items-start gap-4 px-4 pb-6 pt-1 sm:px-6">
        {children}
        <Go href={href} tone={softBtn}>{action}</Go>
      </div>
    </details>
  );
}

export async function HomeFeatures() {
  const [{ ideas, funding, suppliers, machines, guides, news, websites, products, experts }, viewer] = await Promise.all([records(), getViewer()]);
  const sell = !viewer.isMember && !viewer.isStaff;
  // Get started in the hero scrolls to #features; the smooth scroll leaves 96px for the header, which stays
  // in view on the homepage (SmoothScroll, HeaderAutoHide).
  // Weights (client, 11 Nov 2026): headings (h1 to h3, .text-hero) are 900; nothing else on the homepage is bold.
  return (
    <section id="features" className="overflow-x-clip">
      {/* A greeting and the visitor's problem first: one tap from "I need…" to the answer (client, 10 Nov 2026) */}
      <div className={BAND.need}>
      <div className="container-site flex flex-col items-center gap-6 py-10 sm:gap-8 sm:py-14">
        <div data-reveal="" className="rise-soft flex flex-col items-center gap-3 text-center">
          <span className="rounded-full bg-white px-3 py-1 text-[13px] text-ink-soft">{greeting(viewer.name)}</span>
          <h2 className="text-hero text-[28px] leading-[1.15] text-black sm:text-[36px] lg:text-[40px]">What do you need today?</h2>
          <p data-size="" className={body}>Choose one and we take you straight there.</p>
        </div>
        <ul className="grid w-full max-w-[1000px] grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NEEDS.map(([say, href, colour]) => (
            <li key={href}>
              <Link href={href} className="group flex min-h-[68px] items-center gap-3 bg-white p-3 pr-4 text-ink transition-colors hover:bg-brand-tint hover:text-ink">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center ${colour}`}><Icon name={directory(href).icon} className="h-5 w-5" /></span>
                <span className="flex-1 font-display text-[14px] leading-snug">{say}</span>
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-150 group-hover:translate-x-1 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
        <p data-size="" className="text-center text-[14px] text-ink-soft">Not sure where to start? <Link href="/contact" className="">Tell us what you need</Link> and a person will help you.</p>
      </div>
      </div>

      {/* 2. Everything a business needs: the colour panels on a quiet grey-blue band. Made richer on 11 Nov 2026
          (client): rounded panels, each in its colour with a soft light across it (.skin-* in globals.css) and
          its icon large and faint behind the words; the lists sit in glass trays. Same content, same height. */}
      <div className={`${BAND.all} pb-10 sm:pb-14`}>
      <div className="container-site flex flex-col items-center gap-3 pt-10 text-center sm:pt-14">
        <span className="rounded-full bg-white px-3 py-1 text-[13px] text-ink-soft">All in one place</span>
        <h2 className="text-hero text-[28px] leading-[1.15] text-black sm:text-[36px] lg:text-[40px]">Everything a business needs</h2>
        <p data-size="" className={body}>Ideas, machines, money, suppliers and advice. Open any one to begin.</p>
      </div>

      {/* Business Ideas: a green panel built like Machines and Experts below it, and the same height: the words
          and the button on the left, the three newest plans as white photo cards on the right (rows on phones).
          Client, 11 Nov 2026: every colour box on the homepage has the same height (PANEL_H). */}
      <div className="container-site pb-3 pt-8 sm:pt-10">
      <div data-reveal="" className={`rise-soft skin-ideas relative isolate grid grid-cols-[minmax(0,1fr)] items-center gap-6 overflow-hidden rounded-[28px] p-5 sm:p-8 ${PANEL_H} ${ideas.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
        <Icon name="idea" aria-hidden className="pointer-events-none absolute -bottom-12 -left-8 -z-10 h-56 w-56 text-white/[0.07]" strokeWidth={1} />
        <div className="flex flex-col items-start gap-4">
          <Label href="/business-ideas" pill={S.ideas.onColour} />
          <h3 className="text-hero text-[24px] leading-[1.2] text-white sm:text-[28px] lg:text-[32px]">Business plans with the real costs</h3>
          <p data-size="" className="max-w-md text-[14px] leading-relaxed text-white sm:text-[15px]">Ready plans with every cost, line by line.</p>
          <Go href="/business-ideas" tone={S.ideas.onColour}>See business ideas</Go>
        </div>
        {ideas.length ? (
          <ul aria-label="Newest business plans" className="grid grid-cols-[minmax(0,1fr)] gap-2.5 rounded-3xl border border-white/15 bg-white/10 p-3 sm:grid-cols-3 sm:p-4 lg:h-full">
            {ideas.map((idea) => (
              <li key={idea.slug}>
                <Link href={`/business-ideas/${idea.slug}`} className="group flex h-full items-center gap-3 overflow-hidden rounded-2xl bg-white p-2.5 text-ink transition-transform duration-200 hover:text-ink motion-safe:hover:-translate-y-1 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0">
                  <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-auto sm:min-h-[150px] sm:w-full sm:flex-1 sm:rounded-none">
                    <IdeaPhoto src={idea.businessIdea?.pictureUrl} alt="" className="absolute inset-0 h-full transition-transform duration-500 group-hover:scale-[1.05] motion-reduce:transition-none" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:p-3">
                    <span className="font-display text-[14px] leading-snug text-black sm:text-[14px]">{clean(idea.title)}</span>
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6F2EC] text-[#0F5B3E] transition-colors group-hover:bg-[#0F5B3E] group-hover:text-white"><ArrowRight className="h-4 w-4" /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      </div>

      {/* Business Machines, Funding and Suppliers: one joined block. Machines sit on top, photos on the left. */}
      <div className="container-site">
      <div data-machines="" data-reveal="" className={`rise-soft relative grid grid-cols-[minmax(0,1fr)] skin-machines isolate items-center gap-6 overflow-hidden rounded-[28px] p-5 sm:p-8 ${PANEL_H} ${machines.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
        <div data-reveal="" className="relative flex flex-col items-start gap-4">
          <Icon name="machine" aria-hidden className="pointer-events-none absolute -bottom-24 -left-14 -z-10 h-56 w-56 text-white/[0.07]" strokeWidth={1} />
          <Label href="/machines" pill={S.machines.onColour} />
          <h3 className="text-hero text-[24px] leading-[1.2] text-white sm:text-[28px] lg:text-[32px]">The right machine for the job</h3>
          <p data-size="" className="max-w-md text-[14px] leading-relaxed text-white sm:text-[15px]">What each machine does and costs.</p>
          <Go href="/machines" tone={S.machines.onColour}>See business machines</Go>
        </div>
        {machines.length ? (
          <div className="relative flex flex-col gap-2.5 rounded-3xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
            {machines.map((m, n) => {
              const x = m.machine;
              const hasPrice = x && (x.priceMin !== null || x.priceMax !== null);
              const locked = m.accessLevel !== "PUBLIC" && !viewer.isMember;
              return (
                <Link key={m.slug} data-reveal="" style={{ "--d": `${n * 90}ms` } as React.CSSProperties} href={itemHref(m)} className="group flex items-center gap-3 rounded-2xl bg-white/[0.07] p-2.5 text-white transition-colors hover:bg-white/[0.16] hover:text-white sm:gap-4">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-page sm:h-14 sm:w-14">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                    <img src={x?.pictureUrl ?? ""} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  </span>
                  {/* Phones: the price under the name, so the name has the whole width */}
                  <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-[14px] leading-tight sm:text-[14px]">{clean(m.title)}</span>
                    {m.shortSummary ? <span className="line-clamp-1 text-[12px] text-white/85 sm:text-[13px]">{m.shortSummary}</span> : null}
                  </span>
                  {hasPrice ? (locked
                    ? <span className="flex shrink-0 items-center gap-1.5 text-white/80"><span aria-hidden className="select-none font-display text-[14px] text-white blur-[6px] sm:text-[16px]">UGX 0.0M</span><LockKeyhole aria-hidden className="h-4 w-4" /></span>
                    : <span className="shrink-0 font-display text-[14px] leading-tight sm:text-right sm:text-[16px]">{compactRange(x.priceMin, x.priceMax, x.currency)}</span>) : null}
                  </span>
                </Link>
              );
            })}
            {!viewer.isMember ? (
              <p data-size="" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[13px] text-heading">
                <span className="inline-flex items-center gap-2"><LockKeyhole aria-hidden className="h-4 w-4 text-navy" />Prices and where to buy</span>
                <span className="rounded-lg bg-navy px-2.5 py-1 text-[13px] text-white">For members</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
        <ul data-panels="" className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          <Panel href="/funding" title="Every funding source in one list" action="See funding sources" tint="skin-funding" words="text-ink" onColour={S.funding.onColour}
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
                        <span className="truncate font-display text-[13px] group-hover:text-accent-dark">{clean(f.title)}</span>
                        {org ? <span className="truncate text-[12px] text-ink-muted">{clean(org.tradingName ?? org.legalName)}</span> : null}
                      </span>
                      {type ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] ${FUND_TAG[type] ?? "bg-page text-ink-soft"}`}>{type.charAt(0) + type.slice(1).toLowerCase()}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel href="/suppliers" title="A directory of checked suppliers" action="See all suppliers" tint="skin-suppliers" words="text-white" onColour={S.suppliers.onColour}
            text="Checked suppliers in Uganda and abroad.">
            {/* Four suppliers, in two rows of two: with six the list ran past the bottom of the panel, which has a
                fixed height, and cut off the button (seen on the live site, 11 Nov 2026) */}
            <ul className="grid h-full grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              {suppliers.slice(0, 4).map((x, n) => {
                const picture = x.supplier?.listings[0]?.imageUrl || x.supplier?.pictureUrl;
                const name = clean(x.title);
                const sells = x.supplier?.items.slice(0, 2).join(", ");
                return (
                  <li key={x.slug} data-reveal="" style={{ "--d": `${n * 60}ms` } as React.CSSProperties} className="min-h-0">
                    <Link href={`/suppliers/${x.slug}`} className="group flex h-full items-center gap-3 rounded-2xl bg-white p-2.5 text-heading hover:text-heading">
                      <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ${picture ? "bg-page" : MONOGRAM[n % MONOGRAM.length]}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
                        {picture ? <img src={picture} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <span aria-hidden className="font-display text-[16px] leading-none">{name.charAt(0)}</span>}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-display text-[13px] leading-snug group-hover:text-brand">{name}</span>
                        {sells ? <span className="truncate text-[11px] text-ink-soft">{sells}</span> : null}
                        {x.supplier?.country ? <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted"><MapPin aria-hidden className="h-3 w-3 shrink-0" />{x.supplier.country}</span> : null}
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
      <div className="container-site pt-3">
      <div data-experts="" data-reveal="" className={`rise-soft relative grid grid-cols-[minmax(0,1fr)] skin-experts isolate items-center gap-6 overflow-hidden rounded-[28px] p-5 sm:p-8 ${PANEL_H} ${experts.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
        <div data-reveal="" className="relative flex flex-col items-start gap-4">
          <Icon name="expert" aria-hidden className="pointer-events-none absolute -bottom-24 -left-14 -z-10 h-56 w-56 text-white/[0.07]" strokeWidth={1} />
          <Label href="/experts" pill={S.experts.onColour} />
          <h3 className="text-hero text-[24px] leading-[1.2] text-white sm:text-[28px] lg:text-[32px]">Advice from people who know</h3>
          <p data-size="" className="max-w-md text-[14px] leading-relaxed text-white sm:text-[15px]">Checked advisors for the hard parts.</p>
          <Points points={EXPERT_POINTS} mark="text-white" tint="bg-white/10 text-white" start />
          <Go href="/experts" tone={S.experts.onColour}>Find an expert</Go>
        </div>
        {experts.length ? (
          <div className="relative flex flex-col gap-2.5 rounded-3xl border border-white/10 bg-white/[0.08] p-3 sm:p-4">
            {experts.map((e, n) => {
              const c = e.consultant;
              const name = clean(c?.fullName || e.title);
              const role = [c?.professionalTitle, c?.specialties.slice(0, 2).join(", ")].filter(Boolean).join(" · ");
              return (
                <Link key={e.slug} data-reveal="" style={{ "--d": `${n * 90}ms` } as React.CSSProperties} href={itemHref(e)} className={`group flex items-center gap-3 rounded-2xl bg-white/[0.07] p-2.5 text-white transition-colors hover:bg-white/[0.16] hover:text-white sm:gap-4`}>
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white font-display text-[16px] text-[#4A1D6B] sm:h-14 sm:w-14">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                    {c?.photoUrl ? <img src={c.photoUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : name.charAt(0)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-display text-[13px] leading-snug sm:text-[14px]">{name}</span>
                    {role ? <span className="line-clamp-1 text-[11px] text-white/85 sm:text-[12px]">{role}</span> : null}
                    {c?.district ? <span className="flex items-center gap-1 text-[10px] text-white/70 sm:text-[11px]"><MapPin aria-hidden className="h-3 w-3" />{c.district}</span> : null}
                  </span>
                  <ArrowRight aria-hidden className="mr-1 h-4 w-4 shrink-0 text-white transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
      </div>

      </div>

      {/* 3. The everyday services on a mint band: three white cards to use (Tools, Tips, Forum). Then, on a
          lavender band of its own, Guides, News, Prices and Websites as one list of rows that fold open, the
          first one open: what is inside and one button. */}
      <div data-everyday="" className={BAND.everyday}>
      <div className="container-site flex flex-col gap-6 py-10 sm:gap-8 sm:py-14">
        <div data-reveal="" className="rise-soft flex flex-col items-center gap-3 text-center">
          <h2 className={heading}>Help for every working day</h2>
          <p data-size="" className={body}>Work out your numbers, learn from other owners and keep up with what is changing.</p>
        </div>

        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 md:grid-cols-3">
          <Tile href="/tools" art="/lottie/tools.json" title="Your numbers, done in minutes" action="Open the tools" soft={S.tools.soft} softBtn={S.tools.softBtn} ink={S.tools.ink} text="Ready calculators and templates.">
            <Points start points={TOOL_POINTS} mark={S.tools.ink} tint={S.tools.soft} />
          </Tile>
          <Tile href="/tips" art="/lottie/tips.json" title="Tips that save you money" action="Read the tips" soft={S.tips.soft} softBtn={S.tips.softBtn} ink={S.tips.ink} text="Short tips that work, with members' remarks.">
            <Points start points={TIP_POINTS} mark={S.tips.ink} tint={S.tips.soft} />
          </Tile>
          <Tile href="/forum" art="/lottie/forum.json" title="Talk to other owners" action="Join the conversation" soft={S.forum.soft} softBtn={S.forum.softBtn} ink={S.forum.ink} text="Ask, answer and meet other owners.">
            <Points start points={FORUM_POINTS} mark={S.forum.ink} tint={S.forum.soft} />
          </Tile>
        </ul>
      </div>
      </div>

      <div className={BAND.know}>
      <div className="container-site py-10 sm:py-14">
        <div data-reveal="" className="rise-soft flex flex-col gap-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
            <h2 className="text-hero max-w-md text-[22px] leading-[1.2] text-black sm:text-[26px]">Know more before you decide</h2>
            <p data-size="" className="max-w-md text-[14px] leading-relaxed text-ink-soft">Guides, news, today&apos;s market prices and the websites every business needs, kept up to date by our team.</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-line bg-white">
            <More open href="/guides" line="Step-by-step help with registration, licences, EFRIS and tax." action="See all guides" soft={S.guides.soft} softBtn={S.guides.softBtn}>
              <Reading items={guides} />
            </More>
            <More href="/news" line="What is new for business in Uganda." action="Read the news" soft={S.news.soft} softBtn={S.news.softBtn}>
              <Reading items={news} note />
            </More>
            <More href="/prices" line="What things cost today, market by market." action="Check market prices" soft={S.prices.soft} softBtn={S.prices.softBtn}>
              <p data-size="" className="text-[14px] text-ink-soft">Tap a product to see it.</p>
              <ul className="flex flex-wrap gap-2">
              {products.map((x) => <li key={x.name}><Link href={`/prices?q=${encodeURIComponent(x.name)}`} className="inline-flex rounded-full bg-[#FDE8EB] px-3 py-1.5 text-[13px] text-[#C8102E] hover:bg-[#C8102E] hover:text-white">{x.name}</Link></li>)}
            </ul>
            </More>
            <More href="/websites" line="Government and business sites in one list." action="See useful websites" soft={S.websites.soft} softBtn={S.websites.softBtn}>
              {/* A visitor who has not paid sees the first two and one pill for the rest, which opens the join
                  pop-up; the other names are never sent. */}
              <ul className="flex flex-wrap gap-2">
              {(sell ? websites.slice(0, FREE_WEBSITES) : websites).map((w) => (
                <li key={w.slug}><Link href={itemHref(w)} className="inline-flex rounded-full bg-page px-3 py-1.5 text-[13px] text-[#475467] hover:bg-[#475467] hover:text-white">{websiteName(w.title, { hideAddress: w.accessLevel !== "PUBLIC" && sell, siteType: w.website?.siteType })}</Link></li>
              ))}
              {sell && websites.length > FREE_WEBSITES ? (
                <li><Link href="/membership?onboard=pay&next=%2Fwebsites" data-pay="" data-next="/websites" className="inline-flex items-center gap-1.5 rounded-full bg-[#475467] px-3 py-1.5 text-[13px] text-white hover:bg-navy hover:text-white"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />{websites.length - FREE_WEBSITES} more for members</Link></li>
              ) : null}
            </ul>
            </More>
          </div>
        </div>
      </div>
      </div>

      {/* ── For businesses: be found by the buyers who come here. Suppliers and experts pay for a listing;
          this is the site's other income, so it gets a block of its own, not a footer link. ── */}
      {/* In the page's own language: a centred black title like the sections above, then two flat,
          square-cornered panels side by side in the Funding (orange) and Suppliers (blue) colours,
          each with what you get and one button. No new colour, no rounded box, no dark band twice in a row. */}
      {!viewer.isStaff ? (
        <div className={BAND.join}>
        <div className="container-site flex flex-col gap-6 py-10 sm:gap-8 sm:py-14">
          <div data-reveal="" className="rise-soft flex flex-col items-center gap-3 text-center">
            <span className="rounded-full bg-white px-3 py-1 text-[13px] text-ink-soft">For businesses</span>
            <h2 className={heading}>Get your business in front of buyers</h2>
            <p data-size="" className={body}>Business owners come here every day to find who sells what and who can help. Be the one they find.</p>
          </div>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 md:grid-cols-2">
            {([
              ["/suppliers/join", "supplier", "Trusted Suppliers", "Become a Supplier", "For shops, wholesalers, manufacturers, importers and machine dealers.", ["Your own page with your photo and products", "Buyers call you directly", "A dashboard to update it yourself"], "skin-funding text-ink", S.funding.onColour, "bg-white/40"],
              ["/experts/join", "expert", "Business Experts", "Become an Expert", "For accountants, tax advisors, consultants, trainers and other professionals.", ["Your own profile with your services", "The jobs you have done, shown with photos", "Clients call or WhatsApp you directly"], "skin-suppliers text-white", S.suppliers.onColour, "bg-white/15"],
            ] as const).map(([href, icon, kind, title, text, gets, tint, onColour, check], n) => (
              <li key={href} data-reveal="" style={{ "--d": `${n * 90}ms` } as React.CSSProperties} className={`rise-soft flex flex-col gap-4 rounded-[28px] p-5 sm:p-6 lg:p-8 ${tint}`}>
                <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[13px] ${onColour}`}><Icon name={icon} className="h-4 w-4" />{kind}</span>
                <h3 className="text-hero text-[24px] leading-[1.2] sm:text-[28px] lg:text-[32px]">{title}</h3>
                <p data-size="" className="max-w-md text-[14px] leading-relaxed sm:text-[14px]">{text}</p>
                <ul className="flex flex-1 flex-col gap-2">
                  {gets.map((g) => (
                    <li key={g} className="flex items-center gap-2.5 text-[13px] sm:text-[14px]">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${check}`}><Icon name="check" className="h-3.5 w-3.5" /></span>{g}
                    </li>
                  ))}
                </ul>
                <span><Go href={href} tone={onColour}>{title}</Go></span>
              </li>
            ))}
          </ul>
          <p data-size="" className="text-center text-[13px] text-ink-soft">Prefer to talk first? <Link href="/contact?about=supplier_listing" className="">Leave your number</Link> and we call you back.</p>
        </div>
        </div>
      ) : null}

    </section>
  );
}

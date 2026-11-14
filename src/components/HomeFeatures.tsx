import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Coins, FileText, Lightbulb, LockKeyhole, MapPin, Megaphone, MessagesSquare, Percent, Ship, Sprout, Store, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { directory } from "@/config/directories";
import { compactRange, date, itemHref, websiteName } from "@/lib/format";
import { Icon } from "./Icon";
import { IdeaPhoto } from "./IdeaParts";
import { HelpTabs, type HelpTab } from "./HelpTabs";

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
  const [ideas, funding, suppliers, machines, guides, news, websites, products, experts, tips, topics, byType, tracked, topicCount] = await Promise.all([
    prisma.contentItem.findMany({ where: { contentType: "BUSINESS_IDEA", ...live, businessIdea: { AND: [{ pictureUrl: { not: null } }, { pictureUrl: { not: "" } }] } }, select: { slug: true, title: true, businessIdea: { select: { pictureUrl: true } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "FUNDING_PROGRAMME", ...live }, select: { slug: true, title: true, fundingProgramme: { select: { fundingType: true, provider: { select: { organization: { select: { legalName: true, tradingName: true } } } } } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "SUPPLIER", ...live }, select: { slug: true, title: true, supplier: { select: { country: true, items: true, pictureUrl: true, listings: { where: { status: "PUBLISHED", imageUrl: { not: null } }, select: { imageUrl: true }, orderBy: { createdAt: "desc" }, take: 1 } } } }, orderBy: [...newest], take: 6 }),
    prisma.contentItem.findMany({ where: { contentType: "MACHINE", ...live, machine: { pictureUrl: { not: null } } }, select: { slug: true, title: true, contentType: true, shortSummary: true, accessLevel: true, machine: { select: { pictureUrl: true, priceMin: true, priceMax: true, currency: true } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "GUIDE", ...live }, select: item, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "NEWS", ...live }, select: item, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "WEBSITE", ...live }, select: { slug: true, title: true, contentType: true, accessLevel: true, website: { select: { siteType: true } } }, orderBy: [...newest], take: 6 }),
    prisma.product.findMany({ where: { observations: { some: { status: "PUBLISHED" } } }, select: { name: true }, orderBy: { name: "asc" }, distinct: ["name"], take: 6 }),
    // Public fields only: name, title, specialties and district. Contacts stay on the member profile.
    prisma.contentItem.findMany({ where: { contentType: "CONSULTANT", ...live }, select: { slug: true, title: true, contentType: true, consultant: { select: { fullName: true, professionalTitle: true, photoUrl: true, specialties: true, district: true } } }, orderBy: [...newest], take: 3 }),
    // The newest tips and the busiest forum topics: titles only, for the previews in "Help for every working day"
    prisma.contentItem.findMany({ where: { contentType: "BUSINESS_TIP", ...live }, select: { slug: true, title: true, primaryCategory: { select: { name: true } } }, orderBy: [...newest], take: 3 }),
    prisma.forumTopic.findMany({ where: { status: { not: "HIDDEN" } }, select: { id: true, title: true, _count: { select: { posts: { where: { hiddenAt: null } } } } }, orderBy: [{ isPinned: "desc" }, { lastPostAt: "desc" }], take: 3 }).catch(() => []),
    // Real figures for "Help for every working day": how many of each are published
    prisma.contentItem.groupBy({ by: ["contentType"], where: live, _count: { _all: true } }),
    prisma.product.count({ where: { observations: { some: { status: "PUBLISHED" } } } }),
    prisma.forumTopic.count({ where: { status: { not: "HIDDEN" } } }).catch(() => 0),
  ]);
  const counts = Object.fromEntries(byType.map((r) => [r.contentType, r._count._all])) as Record<string, number>;
  return { ideas, funding, suppliers, machines, guides, news, websites, products, experts, tips, topics, counts, tracked, topicCount };
}

/** Websites a visitor who hasn't paid sees in full on the homepage card; the rest are locked. */
const FREE_WEBSITES = 2;
const EXPERT_POINTS: [LucideIcon, string][] = [[Calculator, "Tax"], [BookOpen, "Accounting"], [Ship, "Import and export"], [Sprout, "Farming"]];
const PANEL_H = "lg:h-[400px] xl:h-[372px]"; // small laptops need the extra room: the panel titles wrap there

// The tag on each funding row: what kind of money it is, at a glance.
const FUND_TAG: Record<string, string> = { LOAN: "bg-brand-tint text-brand-dark", GRANT: "bg-[#E6F4EC] text-[#1F7A4D]", EQUITY: "bg-accent-tint text-accent-dark" };

// A supplier with no photo yet gets a bold initial, in shades of the Suppliers blue.
const MONOGRAM = ["bg-brand-dark text-white", "bg-brand-tint text-brand-dark", "bg-navy text-white", "bg-[#D6E9F7] text-brand-dark"];
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
/**
 * Each homepage section sits on its own band, edge to edge, so the sections read as separate rooms (client,
 * 11 Nov 2026). Lower down: a soft blue-grey, then white, then a light blue for "For businesses" (client, 12 Nov
 * 2026: gentle colours, not the mint, lavender and sand that were hard on the eyes; no fade into the footer). Cards have a hairline edge so they still stand out on white.
 */
// "What do you need today?" has the same faint specks as the sections lower down (client, 12 Nov 2026)
const BAND = { need: "speckle speckle-blue", all: "speckle" } as const; // "Everything a business needs": warm off-white with specks (client, 12 Nov 2026)
/** Every colour box on the homepage is this tall on a computer (client, 11 Nov 2026); phones stack and take the room they need. */

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

const Label = ({ href, pill }: { href: string; pill: string }) => {
  const d = directory(href);
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[13px] ${pill}`}><Icon name={d.icon} className="h-4 w-4" />{d.title}</span>;
};

const Go = ({ href, tone = "bg-brand text-white hover:bg-brand-dark hover:text-white", children }: { href: string; tone?: string; children: React.ReactNode }) => (
  <Link href={href} className={`go-btn group mt-1 inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold ${tone}`}>
    {children}<ArrowRight aria-hidden className="go-arrow h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
  </Link>
);

/**
 * A panel in a full brand colour (Funding, Suppliers), redesigned 12 Nov 2026 (client): the words on the left and
 * the button beside them, so the button never crowds the list; the newest entries in one white card with thin
 * lines between them; the hero's specks across the colour. On phones the button sits under the list.
 */
function Panel({ href, title, text, action, tint, words, onColour, children }: { href: string; title: string; text: string; action: string; tint: string; words: string; onColour: string; children: React.ReactNode }) {
  return (
    <li data-reveal="" className={`rise-soft relative isolate flex flex-col gap-4 overflow-hidden rounded-xl p-5 sm:p-6 ${PANEL_H} ${tint}`}>
      <div className={`flex items-start justify-between gap-4 ${words}`}>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <Label href={href} pill={onColour} />
          <h3 className="font-display font-extrabold tracking-[-0.015em] text-[20px] leading-[1.2] sm:text-[22px] lg:text-[24px]">{title}</h3>
          <p data-size="" className="max-w-lg text-[13px] leading-relaxed opacity-90">{text}</p>
        </div>
        <Link href={href} className={`group hidden h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold sm:inline-flex ${onColour}`}>
          {action}<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
        </Link>
      </div>
      {/* min-h-0: the card gives way inside the panel's fixed height rather than spilling out of it */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-white">{children}</div>
      <span className="shrink-0 sm:hidden"><Go href={href} tone={onColour}>{action}</Go></span>
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

export async function HomeFeatures() {
  const [{ ideas, funding, suppliers, machines, guides, news, websites, products, experts, tips, topics, counts, tracked, topicCount }, viewer] = await Promise.all([records(), getViewer()]);
  const sell = !viewer.isMember && !viewer.isStaff;
  const stat = (n: number | undefined, label: string) => (n ? { value: n.toLocaleString("en-GB"), label } : null);
  const helpTabs: HelpTab[] = [
    { id: "guides", label: "Guides", icon: "guide", title: "Step-by-step guides", text: "Registration, licences, EFRIS and tax, explained in plain words, with the documents you need.", action: "See all guides", href: "/guides", window: "Business guides",
      stat: stat(counts.GUIDE, "Guides"), kind: "steps", rows: guides.map((g) => ({ title: clean(g.title), sub: g.shortSummary, href: itemHref(g) })),
      points: ["Each step in order, with what to bring", "Official sources, checked by our team", "Read on the site, or download the PDF"] },
    { id: "tools", label: "Tools", icon: "tool", title: "Your numbers in minutes", text: "Calculators and templates for VAT, PAYE, business plans and cash flow, ready to use.", action: "Open the tools", href: "/tools", window: "VAT calculator",
      stat: stat(counts.TOOL, "Tools"), kind: "vat", rows: [],
      points: ["VAT and PAYE worked out for you", "Templates you can fill in and print", "Uganda's current rates"] },
    { id: "prices", label: "Prices", icon: "prices", title: "Today's market prices", text: "What things cost, market by market across Uganda, so you buy and sell at the right price.", action: "Check prices", href: "/prices", window: "Markets and prices",
      stat: stat(tracked, "Products tracked"), kind: "list", rows: products.slice(0, 5).map((x) => ({ title: x.name, side: "See price", href: `/prices?q=${encodeURIComponent(x.name)}` })),
      points: ["Prices from markets around the country", "See how each price is moving", "Compare markets before you travel"] },
    { id: "news", label: "News", icon: "news", title: "Business news that matters", text: "What is changing for business in Uganda: new rules, funding rounds and opportunities.", action: "Read the news", href: "/news", window: "Latest news",
      stat: stat(counts.NEWS, "News stories"), kind: "list", rows: news.map((n) => ({ title: clean(n.title), sub: n.publishedAt ? date(n.publishedAt) : null, href: itemHref(n) })),
      points: ["Short and to the point", "What it means for your business", "New funding rounds as they open"] },
    { id: "tips", label: "Tips", icon: "tip", title: "Tips that save you money", text: "Short tips that work, from running a shop to keeping records, with remarks from members.", action: "Read the tips", href: "/tips", window: "Business tips",
      stat: stat(counts.BUSINESS_TIP, "Tips"), kind: "list", rows: tips.map((t) => ({ title: clean(t.title), sub: t.primaryCategory?.name ?? null, href: `/tips/${t.slug}` })),
      points: ["A few minutes to read", "Remarks from other owners", "Share any tip in one tap"] },
    { id: "forum", label: "Forum", icon: "forum", title: "Talk to other owners", text: "Ask a question, answer one, find stock and meet other business owners.", action: "Join the conversation", href: "/forum", window: "Business forum",
      stat: stat(topicCount, "Conversations"), kind: "topics", rows: topics.map((t) => ({ title: t.title, side: `${t._count.posts} ${t._count.posts === 1 ? "reply" : "replies"}`, href: `/forum/${t.id}` })),
      points: ["Ask anything about running a business", "Answers from people who have done it", "Free to read for everyone"] },
    { id: "websites", label: "Websites", icon: "link", title: "Useful websites", text: "Government and business sites in one list: registration, tax, export and finance.", action: "See all websites", href: "/websites", window: "Useful websites",
      stat: stat(counts.WEBSITE, "Websites"), kind: "chips",
      // A visitor who has not paid sees the first two and one pill for the rest, which opens the join pop-up; the other names are never sent.
      rows: (sell ? websites.slice(0, FREE_WEBSITES) : websites.slice(0, 6)).map((w) => ({ title: websiteName(w.title, { hideAddress: w.accessLevel !== "PUBLIC" && sell, siteType: w.website?.siteType }), href: itemHref(w) })),
      more: sell && websites.length > FREE_WEBSITES ? { label: `${websites.length - FREE_WEBSITES} more for members`, href: "/membership?onboard=pay&next=%2Fwebsites" } : null,
      points: ["The right official site, first time", "What each site is for", "Checked links, kept up to date"] },
  ];
  // Get started in the hero scrolls to #features; the smooth scroll leaves 96px for the header, which stays
  // in view on the homepage (SmoothScroll, HeaderAutoHide).
  // Weights (client, 11 Nov 2026): headings (h1 to h3, .text-hero) are 900; nothing else on the homepage is bold.
  return (
    <section id="features" className="overflow-x-clip">
      {/* A greeting and the visitor's problem first: one tap from "I need…" to the answer (client, 10 Nov 2026) */}
      <div className={BAND.need}>
      <div className="container-site flex flex-col items-center gap-5 py-6 sm:gap-6 sm:py-8">
        <div data-reveal="" className="rise-soft flex flex-col items-center gap-3 text-center">
          <span className="rounded-full bg-white px-3 py-1 text-[13px] text-ink-soft">{greeting(viewer.name)}</span>
          <h2 className="text-hero text-[24px] leading-[1.15] sm:text-[28px] lg:text-[30px] text-black">What do you need today?</h2>
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
          its icon large and faint behind the words; the lists sit in glass trays. Same content, same height.
          Polished on 12 Nov 2026 (client: keep these designs, make them better): an eyebrow and left-aligned
          heading like the other sections, smaller corners, no faint icons behind the words, bolder names. */}
      <div className={`${BAND.all} pb-4 sm:pb-5`}>
      <div className="container-site flex flex-col gap-2 pt-7 sm:pt-8">
        <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-dark">The platform</span>
        <h2 className="text-hero text-[24px] leading-[1.15] sm:text-[28px] lg:text-[30px] text-black">Everything a business needs</h2>
        <p data-size="" className="max-w-2xl text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">Ideas, machines, money, suppliers and advice, all checked by our team. Open any one to begin.</p>
      </div>

      {/* Business Ideas: a green panel built like Machines and Experts below it, and the same height: the words
          and the button on the left, the three newest plans as white photo cards on the right (rows on phones).
          Client, 11 Nov 2026: every colour box on the homepage has the same height (PANEL_H). */}
      <div className="container-site pb-3 pt-5 sm:pt-6">
      <div data-reveal="" className={`rise-soft skin-ideas relative isolate grid grid-cols-[minmax(0,1fr)] items-center gap-6 overflow-hidden rounded-xl p-5 sm:p-7 ${PANEL_H} ${ideas.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
                <div className="flex flex-col items-start gap-4">
          <Label href="/business-ideas" pill={S.ideas.onColour} />
          <h3 className="font-display font-extrabold tracking-[-0.015em] text-[20px] leading-[1.2] text-white sm:text-[22px] lg:text-[24px]">Business plans with the real costs</h3>
          <p data-size="" className="max-w-md text-[14px] leading-relaxed text-white sm:text-[15px]">Ready plans with every cost, line by line.</p>
          <Go href="/business-ideas" tone={S.ideas.onColour}>See business ideas</Go>
        </div>
        {ideas.length ? (
          <ul aria-label="Newest business plans" className="grid grid-cols-[minmax(0,1fr)] gap-2.5 rounded-xl border border-white/15 bg-white/10 p-3 sm:grid-cols-3 sm:p-4 lg:h-full">
            {ideas.map((idea) => (
              <li key={idea.slug}>
                <Link href={`/business-ideas/${idea.slug}`} className="group flex h-full items-center gap-3 overflow-hidden rounded-lg bg-white p-2.5 text-ink transition-transform duration-200 hover:text-ink motion-safe:hover:-translate-y-1 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0">
                  <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-auto sm:min-h-[150px] sm:w-full sm:flex-1 sm:rounded-none">
                    <IdeaPhoto src={idea.businessIdea?.pictureUrl} alt="" className="absolute inset-0 h-full transition-transform duration-500 group-hover:scale-[1.05] motion-reduce:transition-none" />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:flex-none sm:p-3">
                    {/* Smaller (client, 14 Nov 2026), to match the funding and supplier panels */}
                    <span className="font-display text-[12.5px] font-bold leading-snug text-black sm:text-[13px]">{clean(idea.title)}</span>
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
      <div data-machines="" data-reveal="" className={`rise-soft relative grid grid-cols-[minmax(0,1fr)] skin-machines isolate items-center gap-6 overflow-hidden rounded-xl p-5 sm:p-7 ${PANEL_H} ${machines.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
        <div data-reveal="" className="relative flex flex-col items-start gap-4">
          <Label href="/machines" pill={S.machines.onColour} />
          <h3 className="font-display font-extrabold tracking-[-0.015em] text-[20px] leading-[1.2] text-white sm:text-[22px] lg:text-[24px]">The right machine for the job</h3>
          <p data-size="" className="max-w-md text-[14px] leading-relaxed text-white sm:text-[15px]">What each machine does and costs.</p>
          <Go href="/machines" tone={S.machines.onColour}>See business machines</Go>
        </div>
        {machines.length ? (
          <div className="relative flex flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.07] p-3 sm:p-4">
            {machines.map((m, n) => {
              const x = m.machine;
              const hasPrice = x && (x.priceMin !== null || x.priceMax !== null);
              const locked = m.accessLevel !== "PUBLIC" && !viewer.isMember;
              return (
                <Link key={m.slug} data-reveal="" style={{ "--d": `${n * 90}ms` } as React.CSSProperties} href={itemHref(m)} className="group flex items-center gap-3 rounded-lg bg-white/[0.07] p-2.5 text-white transition-colors hover:bg-white/[0.16] hover:text-white sm:gap-4">
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-page sm:h-14 sm:w-14">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                    <img src={x?.pictureUrl ?? ""} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  </span>
                  {/* Phones: the price under the name, so the name has the whole width */}
                  <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-[14px] font-bold leading-tight">{clean(m.title)}</span>
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
              <p data-size="" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-white px-4 py-2.5 text-[13px] text-heading">
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
            <ul className="grid h-full auto-rows-fr grid-cols-[minmax(0,1fr)] gap-px bg-line">
              {funding.map((f, n) => {
                const org = f.fundingProgramme?.provider.organization;
                const type = f.fundingProgramme?.fundingType;
                return (
                  <li key={f.slug} data-reveal="" style={{ "--d": `${n * 70}ms` } as React.CSSProperties} className="bg-white">
                    <Link href={`/funding/${f.slug}`} className="group flex h-full items-center gap-3 px-4 py-3 text-heading transition-colors hover:bg-[#FFF6EC] hover:text-heading">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-dark"><Icon name="funding" className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-display text-[13px] font-bold group-hover:text-accent-dark">{clean(f.title)}</span>
                        {org ? <span className="truncate text-[11px] text-ink-muted">{clean(org.tradingName ?? org.legalName)}</span> : null}
                      </span>
                      {type ? <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${FUND_TAG[type] ?? "bg-page text-ink-soft"}`}>{type.charAt(0) + type.slice(1).toLowerCase()}</span> : null}
                      <ArrowRight aria-hidden className="hidden h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-dark sm:block" />
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
            <ul className="grid h-full auto-rows-fr grid-cols-[minmax(0,1fr)] gap-px bg-line sm:grid-cols-2">
              {suppliers.slice(0, 4).map((x, n) => {
                const picture = x.supplier?.listings[0]?.imageUrl || x.supplier?.pictureUrl;
                const name = clean(x.title);
                const sells = x.supplier?.items.slice(0, 2).join(", ");
                return (
                  <li key={x.slug} data-reveal="" style={{ "--d": `${n * 60}ms` } as React.CSSProperties} className="min-h-0 bg-white">
                    <Link href={`/suppliers/${x.slug}`} className="group flex h-full items-center gap-3 px-4 py-3 text-heading transition-colors hover:bg-[#EEF6FC] hover:text-heading">
                      <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg ${picture ? "bg-page" : MONOGRAM[n % MONOGRAM.length]}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
                        {picture ? <img src={picture} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <span aria-hidden className="font-display text-[13px] font-extrabold leading-none">{name.split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join("").toUpperCase()}</span>}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-display text-[13px] font-bold leading-snug group-hover:text-brand">{name}</span>
                        {sells ? <span className="truncate text-[10px] text-ink-soft">{sells}</span> : null}
                        {x.supplier?.country ? <span className="inline-flex items-center gap-1 text-[9.5px] text-ink-muted"><MapPin aria-hidden className="h-3 w-3 shrink-0" />{x.supplier.country}</span> : null}
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
      <div data-experts="" data-reveal="" className={`rise-soft relative grid grid-cols-[minmax(0,1fr)] skin-experts isolate items-center gap-6 overflow-hidden rounded-xl p-5 sm:p-7 ${PANEL_H} ${experts.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
        <div data-reveal="" className="relative flex flex-col items-start gap-4">
          <Label href="/experts" pill={S.experts.onColour} />
          <h3 className="font-display font-extrabold tracking-[-0.015em] text-[20px] leading-[1.2] text-white sm:text-[22px] lg:text-[24px]">Advice from people who know</h3>
          <p data-size="" className="max-w-md text-[14px] leading-relaxed text-white sm:text-[15px]">Checked advisors for the hard parts.</p>
          <Points points={EXPERT_POINTS} mark="text-white" tint="bg-white/10 text-white" start />
          <Go href="/experts" tone={S.experts.onColour}>Find an expert</Go>
        </div>
        {experts.length ? (
          <div className="relative flex flex-col gap-2.5 rounded-xl border border-white/10 bg-white/[0.08] p-3 sm:p-4">
            {experts.map((e, n) => {
              const c = e.consultant;
              const name = clean(c?.fullName || e.title);
              const role = [c?.professionalTitle, c?.specialties.slice(0, 2).join(", ")].filter(Boolean).join(" · ");
              return (
                <Link key={e.slug} data-reveal="" style={{ "--d": `${n * 90}ms` } as React.CSSProperties} href={itemHref(e)} className={`group flex items-center gap-3 rounded-lg bg-white/[0.07] p-2.5 text-white transition-colors hover:bg-white/[0.16] hover:text-white sm:gap-4`}>
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white font-display text-[16px] text-[#4A1D6B] sm:h-14 sm:w-14">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or editor-entered address */}
                    {c?.photoUrl ? <img src={c.photoUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : name.charAt(0)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {/* Smaller (client, 14 Nov 2026), to match the funding and supplier panels */}
                    <span className="font-display text-[12.5px] font-bold leading-snug sm:text-[13px]">{name}</span>
                    {role ? <span className="line-clamp-1 text-[10px] text-white/85 sm:text-[11px]">{role}</span> : null}
                    {c?.district ? <span className="flex items-center gap-1 text-[9.5px] text-white/70 sm:text-[10px]"><MapPin aria-hidden className="h-2.5 w-2.5" />{c.district}</span> : null}
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

      {/* 3. Help for every working day, as a tabbed showcase (client, 12 Nov 2026, after a SaaS site they liked): a
          warm off-white band with a faint speckle (.speckle in globals.css), a centred heading, pill tabs and one
          panel per part of the product (HelpTabs). Real content and real counts only. */}
      <div data-everyday="" className="speckle">
      <div className="container-site flex flex-col items-center gap-5 pb-6 pt-7 sm:gap-6 sm:pb-8 sm:pt-8">
        <div data-reveal="" className="rise-soft flex max-w-2xl flex-col items-center gap-3 text-center">
          <h2 className="text-hero text-[24px] leading-[1.15] sm:text-[28px] lg:text-[30px] text-[#0B1F33]">Help for every working day</h2>
          <p data-size="" className="text-[14px] leading-relaxed text-ink-soft sm:text-[15px]">Guides, tools, prices, news, tips and the forum, checked and kept up to date by our team.</p>
        </div>
        <HelpTabs tabs={helpTabs} />
      </div>
      </div>

      {/* For businesses, on the same textured band as the section above, before the navy footer */}
      <div className="speckle">
      <div className="container-site flex flex-col pb-8 pt-2 sm:pb-10 sm:pt-2">
        {/* ── For businesses: be found by the buyers who come here. Suppliers and experts pay for a listing; this is
            the site's other income, so it gets a block of its own. One navy banner inside the page. ── */}
        {!viewer.isStaff ? (
          <div data-reveal="" className="rise-soft relative isolate overflow-hidden rounded-xl bg-[#0B1F44] p-6 text-white sm:p-10 lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
              <div className="flex flex-col items-start gap-4">
                <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">For businesses</span>
                <h2 className="text-hero text-[24px] leading-[1.15] sm:text-[28px] lg:text-[30px] text-white">Get your business in front of buyers</h2>
                <p data-size="" className="max-w-md text-[15px] leading-relaxed text-white/75">Business owners come here every day to find who sells what and who can help. Be the one they find.</p>
                <p data-size="" className="text-[13px] text-white/65">Prefer to talk first? <Link href="/contact?about=supplier_listing" className="font-semibold text-accent hover:text-white">Leave your number</Link> and we call you back.</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {([
                  ["/suppliers/join", "supplier", "Become a Supplier", "Shops, wholesalers, manufacturers, importers and machine dealers.", ["Your own page with photos and products", "Buyers call you directly", "Update it yourself"], "bg-accent text-ink hover:bg-white hover:text-ink"],
                  ["/experts/join", "expert", "Become an Expert", "Accountants, tax advisors, consultants and trainers.", ["Your own profile and services", "Your past jobs, with photos", "Clients call or WhatsApp you"], "bg-white text-heading hover:bg-accent hover:text-ink"],
                ] as const).map(([href, icon, title, who, gets, btn]) => (
                  <li key={href} className="flex flex-col gap-4 rounded-lg bg-white/[0.07] p-5 sm:p-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-accent"><Icon name={icon} className="h-5 w-5" /></span>
                    <span className="flex flex-col gap-1"><span className="font-display text-[20px] font-bold leading-tight text-white">{title}</span><span className="text-[13px] leading-snug text-white/70">{who}</span></span>
                    <ul className="flex flex-1 flex-col gap-2">
                      {gets.map((g) => <li key={g} className="flex items-start gap-2 text-[13px] text-white/85"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{g}</li>)}
                    </ul>
                    <Link href={href} className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-[14px] font-semibold transition-colors ${btn}`}>{title}<ArrowRight aria-hidden className="h-4 w-4" /></Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
      </div>

    </section>
  );
}

import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Check, FileText, LockKeyhole, MapPin, Percent, Ship, Sprout, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/access";
import { PERIOD_INFO, PLAN_PERIODS, popupPlan, type MemberPeriod } from "@/lib/billing";
import { cachedMemberPlan } from "@/lib/cached";
import { directory } from "@/config/directories";
import { compactRange, date, itemHref } from "@/lib/format";
import { FanTilt } from "./FanTilt";
import { Icon } from "./Icon";
import { IdeaPhoto } from "./IdeaParts";
import { PanelParticles } from "./PanelParticles";

/**
 * The homepage below the hero: what BizSphere-Ug offers. A centred title; Business Ideas as the wide
 * feature, words on the left and a fan of photos on the right; Business Machines with the words and
 * photos swapped, so the page swings as it flows; then Funding and Suppliers as two
 * joined panels (Panel below) with real listings in them; then Experts and Tools side by side on
 * white (Card below); Guides and News on a navy band; Market Prices and Useful Websites on
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
  const [ideas, funding, suppliers, machines, guides, news, websites, products] = await Promise.all([
    prisma.contentItem.findMany({ where: { contentType: "BUSINESS_IDEA", ...live }, select: { slug: true, title: true, businessIdea: { select: { pictureUrl: true } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "FUNDING_PROGRAMME", ...live }, select: { slug: true, title: true, fundingProgramme: { select: { fundingType: true, provider: { select: { organization: { select: { legalName: true, tradingName: true } } } } } } }, orderBy: [...newest], take: 4 }),
    prisma.contentItem.findMany({ where: { contentType: "SUPPLIER", ...live }, select: { slug: true, title: true, supplier: { select: { country: true, items: true, pictureUrl: true, listings: { where: { status: "PUBLISHED", imageUrl: { not: null } }, select: { imageUrl: true }, orderBy: { createdAt: "desc" }, take: 1 } } } }, orderBy: [...newest], take: 8 }),
    prisma.contentItem.findMany({ where: { contentType: "MACHINE", ...live, machine: { pictureUrl: { not: null } } }, select: { slug: true, title: true, contentType: true, shortSummary: true, accessLevel: true, machine: { select: { pictureUrl: true, priceMin: true, priceMax: true, currency: true } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "GUIDE", ...live }, select: item, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "NEWS", ...live }, select: item, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "WEBSITE", ...live }, select: item, orderBy: [...newest], take: 6 }),
    prisma.product.findMany({ where: { observations: { some: { status: "PUBLISHED" } } }, select: { name: true }, orderBy: { name: "asc" }, distinct: ["name"], take: 6 }),
  ]);
  return { ideas, funding, suppliers, machines, guides, news, websites, products };
}

const EXPERT_POINTS: [LucideIcon, string][] = [[Calculator, "Tax"], [BookOpen, "Accounting"], [Ship, "Import and export"], [Sprout, "Farming"]];
const TOOL_POINTS: [LucideIcon, string][] = [[Percent, "VAT"], [Users, "PAYE"], [FileText, "Business plans"], [TrendingUp, "Cash flow"]];

// The tag on each funding row: what kind of money it is, at a glance.
const FUND_TAG: Record<string, string> = { LOAN: "bg-brand-tint text-brand-dark", GRANT: "bg-[#E6F4EC] text-[#1F7A4D]", EQUITY: "bg-accent-tint text-accent-dark" };

// A supplier with no photo yet gets a bold initial, in turn from the brand colours.
const MONOGRAM = ["bg-navy text-white", "bg-accent text-ink", "bg-brand-tint text-brand-dark", "bg-accent-tint text-accent-dark"];

/** Opens the sign-up and payment pop-up here on the homepage (data-pay, src/components/Onboarding.tsx), with the length chosen. */
const pay = (period: MemberPeriod) => ({ href: `/membership?onboard=pay&period=${period}&next=%2Fbusiness-ideas`, "data-pay": "", "data-period": period, "data-next": "/business-ideas" });
const BENEFITS = ["Full business plans and budgets", "Supplier and expert contacts", "Funding amounts and terms", "Machine prices and price history", "Tools, templates and downloads"];
const LENGTHS: Record<MemberPeriod, { title: string; text: string }> = {
  DAILY: { title: "Day pass", text: "Research an idea in a day" },
  WEEKLY: { title: "Weekly", text: "Compare ideas and call suppliers" },
  MONTHLY: { title: "Monthly", text: "Plan and start your business" },
  YEARLY: { title: "Yearly", text: "Run and grow your business" },
};
const joinButton = "group inline-flex h-[52px] items-center justify-center gap-1.5 rounded-full bg-accent px-8 text-[16px] font-bold text-ink hover:bg-accent-dark hover:text-white";

const heading = "text-hero text-[22px] leading-[1.2] text-black sm:text-[26px] lg:text-[30px]";
const body = "mx-auto max-w-md text-[16px] leading-relaxed text-ink-soft sm:text-[17px]";
const cardHeading = "text-hero text-[20px] leading-[1.2] text-black sm:text-[23px] lg:text-[26px]";

const Label = ({ href, tone = "text-brand" }: { href: string; tone?: string }) => {
  const d = directory(href);
  return <span className={`inline-flex items-center gap-1.5 text-[13px] font-bold sm:text-[14px] ${tone}`}><Icon name={d.icon} className="h-4 w-4" />{d.title}</span>;
};

const Go = ({ href, tone = "bg-brand text-white hover:bg-brand-dark hover:text-white", children }: { href: string; tone?: string; children: React.ReactNode }) => (
  <Link href={href} className={`group mt-1 inline-flex h-12 items-center gap-1.5 rounded-full px-6 text-[15px] font-bold ${tone}`}>
    {children}<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
  </Link>
);

/**
 * One part: name, heading, sentence, what it holds and a button at the bottom, so two side by side line up.
 */
function Card({ href, title, text, action, mark, button, dark = false, children }: { href: string; title: string; text: string; action: string; mark: string; button?: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <li data-reveal="" className="rise-soft">
      <div className="flex h-full flex-col items-center gap-3 text-center">
        <Label href={href} tone={mark} />
        <h3 className={dark ? "text-hero text-[23px] leading-[1.2] text-white sm:text-[27px] lg:text-[30px]" : cardHeading}>{title}</h3>
        <p className={`mx-auto max-w-lg text-[15px] leading-relaxed sm:text-[16px] ${dark ? "text-white" : "text-ink-soft"}`}>{text}</p>
        <div className="w-full flex-1">{children}</div>
        <span className="mt-auto pt-1"><Go href={href} tone={button}>{action}</Go></span>
      </div>
    </li>
  );
}

/** A panel in a full brand colour, joined to the one beside it: the words at the top and real listings under them, with its button at the bottom so two side by side line up. */
function Panel({ href, title, text, action, tint, words, children }: { href: string; title: string; text: string; action: string; tint: string; words: string; children: React.ReactNode }) {
  return (
    <li data-reveal="" className={`rise-soft flex flex-col gap-4 p-5 sm:p-7 ${tint}`}>
      <div className={`flex flex-col items-start gap-2 ${words}`}>
        <Label href={href} tone="" />
        <h3 className="text-hero text-[20px] leading-[1.2] sm:text-[23px] lg:text-[26px]">{title}</h3>
        <p className="max-w-lg text-[15px] font-medium leading-relaxed sm:text-[16px]">{text}</p>
      </div>
      <div className="flex-1">{children}</div>
      <span><Go href={href} tone="bg-white text-heading hover:bg-navy hover:text-white">{action}</Go></span>
    </li>
  );
}

const Points = ({ points, mark, tint }: { points: [LucideIcon, string][]; mark: string; tint: string }) => (
  <ul className="flex flex-wrap justify-center gap-2">
    {points.map(([Glyph, label]) => (
      <li key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${tint}`}><Glyph aria-hidden className={`h-4 w-4 ${mark}`} strokeWidth={1.75} />{label}</li>
    ))}
  </ul>
);

/** Plain rows of reading: a name, a line under it, a hairline between. No background of their own. */
const Reading = ({ items, note }: { items: { slug: string; title: string; contentType: string; shortSummary: string | null; publishedAt: Date | null }[]; note?: boolean }) => (
  <ul className="mx-auto flex w-full max-w-xl flex-col divide-y divide-white/20 text-left">
    {items.map((r, n) => (
      <li key={r.slug} data-reveal="" style={{ "--d": `${n * 60}ms` } as React.CSSProperties}>
        <Link href={itemHref(r)} className="group flex flex-col gap-0.5 py-3 text-white hover:text-white">
          {note && r.publishedAt ? <span className="text-[12px] font-semibold text-accent">{date(r.publishedAt)}</span> : null}
          <span className="font-display text-[16px] font-extrabold leading-snug group-hover:text-accent">{clean(r.title)}</span>
          {r.shortSummary ? <span className="line-clamp-1 text-[14px] text-white/85">{r.shortSummary}</span> : null}
        </Link>
      </li>
    ))}
  </ul>
);

export async function HomeFeatures() {
  const [{ ideas, funding, suppliers, machines, guides, news, websites, products }, viewer, memberPlan] = await Promise.all([records(), getViewer(), cachedMemberPlan()]);
  const plan = popupPlan(memberPlan);
  const offered = PLAN_PERIODS.filter((p) => plan.amounts[p]);
  const price = (p: MemberPeriod) => `${plan.currency} ${plan.amounts[p]!.toLocaleString("en-UG")}`;
  const lowest = offered[0];
  const start = offered.includes("MONTHLY") ? "MONTHLY" : lowest;
  const sell = !viewer.isMember && !viewer.isStaff && Boolean(start);
  // The newest idea sits in the middle of the fan, on top
  const fan = ideas.length === 3 ? [ideas[1], ideas[0], ideas[2]] : ideas;
  // The moving row must be wider than its panel to loop without a gap, so a short list repeats.
  const strip = suppliers.length ? Array.from({ length: Math.ceil(5 / suppliers.length) }, () => suppliers).flat() : [];

  return (
    <section id="features" className="scroll-mt-24 overflow-x-clip bg-[#F3F8FC]">
      <div className="container-site flex flex-col items-center gap-3 pt-10 text-center sm:pt-14">
        <h2 className="max-w-3xl text-hero text-[27px] leading-[1.12] text-black sm:text-[35px] lg:text-[42px]">Everything a business needs, on one platform</h2>
        <p className="max-w-xl text-[16px] leading-relaxed text-ink-soft sm:text-[18px]">BizSphere-Ug brings business plans, funding, suppliers, expert help and tools together, so you can decide with real information.</p>
        {sell ? (
          <div className="mt-2 flex flex-col items-center gap-2">
            <Link {...pay(start)} className={joinButton}>Get full access<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" /></Link>
            <span className="text-[15px] text-ink-soft">From <strong className="font-extrabold text-heading">{price(lowest)}</strong> a {PERIOD_INFO[lowest].per}. Pay with mobile money or card.</span>
          </div>
        ) : null}
      </div>

      <div className="container-site grid grid-cols-[minmax(0,1fr)] items-center gap-6 py-10 sm:py-12 lg:grid-cols-2 lg:gap-12">
        <div data-reveal="" className="rise-soft flex flex-col items-center gap-3 text-center">
          <Label href="/business-ideas" />
          <h3 className={heading}>Business plans with the real costs</h3>
          <p className={body}>Not sure what to start? Browse ready plans with every requirement and a line-by-line budget, in small, medium and large sizes.</p>
          <Go href="/business-ideas">See business ideas</Go>
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

      {/* Business Machines, Funding and Suppliers: one joined block. Machines sit on top, photos on the left. */}
      <div className="container-site">
      <div data-machines="" data-reveal="" className={`rise-soft relative grid grid-cols-[minmax(0,1fr)] items-center gap-6 overflow-hidden bg-navy p-5 sm:p-8 ${machines.length ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10" : ""}`}>
        <PanelParticles />
        <div data-reveal="" className="relative flex flex-col items-start gap-4">
          <span className="rounded-full bg-accent px-3 py-1 text-[13px] font-bold text-ink">{directory("/machines").title}</span>
          <h3 className="text-hero text-[30px] leading-[1.08] text-white sm:text-[38px] lg:text-[46px]">The right machine for the job</h3>
          <p className="max-w-md text-[16px] leading-relaxed text-white sm:text-[17px]">{directory("/machines").text}</p>
          <Go href="/machines" tone="bg-accent text-ink hover:bg-white hover:text-ink">See business machines</Go>
        </div>
        {machines.length ? (
          <div className="relative flex flex-col gap-2.5 rounded-3xl bg-brand-dark p-3 sm:p-4">
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
                    <span className="font-display text-[16px] font-extrabold leading-tight sm:text-[19px]">{clean(m.title)}</span>
                    {m.shortSummary ? <span className="line-clamp-1 text-[13px] text-white/85 sm:text-[14px]">{m.shortSummary}</span> : null}
                  </span>
                  {hasPrice ? (locked
                    ? <span className="flex shrink-0 items-center gap-1.5 text-accent"><span aria-hidden className="select-none text-hero text-[18px] text-white blur-[6px] sm:text-[22px]">UGX 0.0M</span><LockKeyhole aria-hidden className="h-4 w-4" /></span>
                    : <span className="shrink-0 text-hero text-[16px] leading-tight sm:text-right sm:text-[22px]">{compactRange(x.priceMin, x.priceMax, x.currency)}</span>) : null}
                  </span>
                </Link>
              );
            })}
            {!viewer.isMember ? (
              <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[14px] font-semibold text-heading">
                <span className="inline-flex items-center gap-2"><LockKeyhole aria-hidden className="h-4 w-4 text-brand" />Prices and where to buy</span>
                <span className="rounded-lg bg-brand-dark px-2.5 py-1 text-[13px] font-bold text-white">For members</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
        <ul data-panels="" className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:mt-5 sm:gap-5 md:grid-cols-2">
          <Panel href="/funding" title="Every funding source in one list" action="See funding sources" tint="bg-accent" words="text-ink"
            text="Need money to start or grow? Compare banks, government programmes and other lenders.">
            <ul className="flex h-full flex-col gap-2">
              {funding.map((f, n) => {
                const org = f.fundingProgramme?.provider.organization;
                const type = f.fundingProgramme?.fundingType;
                return (
                  <li key={f.slug} data-reveal="" style={{ "--d": `${n * 70}ms` } as React.CSSProperties} className="flex-1">
                    <Link href={`/funding/${f.slug}`} className="group flex h-full items-center gap-3 rounded-2xl bg-white p-3 text-heading hover:text-heading">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent-dark"><Icon name="funding" className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-display text-[15px] font-bold group-hover:text-brand">{clean(f.title)}</span>
                        {org ? <span className="truncate text-[13px] text-ink-muted">{clean(org.tradingName ?? org.legalName)}</span> : null}
                      </span>
                      {type ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${FUND_TAG[type] ?? "bg-page text-ink-soft"}`}>{type.charAt(0) + type.slice(1).toLowerCase()}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel href="/suppliers" title="A directory of checked suppliers" action="See all suppliers" tint="bg-brand" words="text-white"
            text="Looking for stock or materials? Find suppliers in Uganda and abroad, with contacts our team has checked.">
            {/* Runs to the panel's edges, where it fades into the blue (.marquee-soft in globals.css) */}
            <div className="marquee marquee-soft -mx-5 h-full sm:-mx-7">
              <div className="marquee-viewport h-full overflow-hidden">
                <div className="marquee-track flex h-full w-max" style={{ "--marquee-duration": `${strip.length * 6}s` } as React.CSSProperties}>
                  {[false, true].map((dup) => (
                    <ul key={String(dup)} aria-hidden={dup || undefined} className={`flex h-full shrink-0 gap-2.5 pr-2.5 ${dup ? "marquee-dup" : ""}`}>
                      {strip.map((x, n) => {
                        const picture = x.supplier?.listings[0]?.imageUrl || x.supplier?.pictureUrl;
                        const name = clean(x.title);
                        const sells = x.supplier?.items.slice(0, 2).join(", ");
                        return (
                          <li key={n} className="w-[200px] shrink-0 sm:w-[220px]">
                            <Link href={`/suppliers/${x.slug}`} tabIndex={dup ? -1 : undefined} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white text-heading hover:text-heading">
                              <span className={`relative flex min-h-[150px] flex-1 items-center justify-center overflow-hidden ${picture ? "bg-page" : MONOGRAM[n % MONOGRAM.length]}`}>
                                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
                                {picture ? <img src={picture} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" /> : <span aria-hidden className="font-display text-[44px] font-extrabold leading-none">{name.charAt(0)}</span>}
                              </span>
                              <span className="flex min-w-0 flex-col gap-0.5 p-3">
                                <span className="line-clamp-1 font-display text-[14px] font-extrabold leading-tight group-hover:text-brand">{name}</span>
                                {sells ? <span className="line-clamp-1 text-[12px] font-medium text-ink-soft">{sells}</span> : null}
                                {x.supplier?.country ? <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted"><MapPin aria-hidden className="h-3 w-3 shrink-0" />{x.supplier.country}</span> : null}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </ul>
      </div>

      <div className="container-site py-8 sm:py-12">
        <ul className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
      <Card href="/experts" title="Advice from people who know" action="Find an expert" mark="text-brand"
        text="Don't guess on the hard parts. Talk to checked advisors and see the services they offer and the jobs they've done.">
        <Points points={EXPERT_POINTS} mark="text-white" tint="bg-brand-dark text-white" />
      </Card>

      <Card href="/tools" title="Your numbers, done in minutes" action="Open the tools" mark="text-accent-dark" button="bg-accent text-ink hover:bg-accent-dark hover:text-white"
        text="Stop working it out by hand. Use ready calculators and templates for the sums every business has to do.">
        <Points points={TOOL_POINTS} mark="text-ink" tint="bg-accent text-ink" />
      </Card>
        </ul>
      </div>

      {/* Learn and keep up: navy, so the orange buttons stand out most here */}
      <div data-reading="" className="bg-navy">
      <div className="container-site py-8 sm:py-12">
        <ul className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
          <Card dark href="/guides" title="Step-by-step help" action="See all guides" mark="text-accent" button="bg-accent text-ink hover:bg-white hover:text-ink" text={directory("/guides").text}>
            <Reading items={guides} />
          </Card>
          <Card dark href="/news" title="Know what is changing" action="Read the news" mark="text-accent" button="bg-accent text-ink hover:bg-white hover:text-ink" text={directory("/news").text}>
            <Reading items={news} note />
          </Card>
        </ul>
      </div>
      </div>

      <div className="container-site py-8 sm:py-12">
        <ul className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
          <Card href="/prices" title="What things cost today" action="Check market prices" mark="text-accent-dark" button="bg-accent text-ink hover:bg-accent-dark hover:text-white" text={directory("/prices").text}>
            <ul className="flex flex-wrap justify-center gap-2">
              {products.map((x) => <li key={x.name} className="rounded-full bg-accent px-3 py-1.5 text-[13px] font-semibold text-ink">{x.name}</li>)}
            </ul>
          </Card>
          <Card href="/websites" title="The websites you will need" action="See useful websites" mark="text-brand" text={directory("/websites").text}>
            <ul className="flex flex-wrap justify-center gap-2">
              {websites.map((w) => <li key={w.slug}><Link href={itemHref(w)} className="inline-flex rounded-full bg-brand-dark px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-navy hover:text-white">{clean(w.title)}</Link></li>)}
            </ul>
          </Card>
        </ul>
      </div>

      <div className="bg-brand text-white">
        <div data-reveal="" className="rise-soft container-site flex flex-col items-center gap-3 py-10 text-center sm:py-12">
          <h2 className="text-hero text-[20px] leading-[1.2] sm:text-[26px]">Start using BizSphere-Ug today</h2>
          {sell ? (
            <>
              <p className="max-w-md text-[16px] leading-relaxed text-white/90 sm:text-[18px]">One membership opens all of this:</p>
              <ul className="flex max-w-3xl flex-wrap justify-center gap-x-5 gap-y-1.5">
                {BENEFITS.map((b) => <li key={b} className="flex items-center gap-1.5 text-[15px] font-semibold"><Check aria-hidden className="h-4 w-4 shrink-0 text-accent" strokeWidth={3} />{b}</li>)}
              </ul>
              <ul className="mt-3 grid w-full max-w-4xl grid-cols-2 gap-2.5 text-left sm:gap-3 lg:grid-cols-4">
                {offered.map((p) => (
                  <li key={p}>
                    <Link {...pay(p)} className="group flex h-full flex-col gap-1 rounded-2xl bg-white p-4 text-heading hover:text-heading">
                      <span className="text-[14px] font-bold text-ink-soft">{LENGTHS[p].title}</span>
                      <span className="font-display text-[20px] font-extrabold leading-tight sm:text-[23px]">{price(p)}</span>
                      <span className="text-[13px] leading-snug text-ink-muted">{LENGTHS[p].text}</span>
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-[14px] font-bold text-brand">Choose<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-[14px] text-white/90">Pay with MTN MoMo, Airtel Money, Visa or Mastercard.</p>
            </>
          ) : (
            <Link href="/business-ideas" className={`${joinButton} mt-2`}>Browse business ideas<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" /></Link>
          )}
        </div>
      </div>
    </section>
  );
}

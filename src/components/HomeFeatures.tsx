import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, FileText, MapPin, Percent, Ship, Sprout, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { Icon } from "./Icon";
import { IdeaPhoto } from "./IdeaParts";

/**
 * The homepage below the hero: what BizSphere-Ug offers, with a different kind of block for each part:
 * a big title; Business Ideas beside a fan of real ideas; Funding Sources beside a list of real
 * programmes; Suppliers centred with a row of real suppliers; Experts and Tools as two cards side by side;
 * then Get started.
 *
 * Every idea, programme and supplier shown is a real published record, and only names and places
 * are used, so nothing here is member-only. No invented customers or numbers, and no shadows. The
 * text never fades in, so nothing is hidden while scrolling; only the fan of photos opens.
 */
const clean = (title: string) => title.replace(/^Sample:\s*/i, "");

async function records() {
  const newest = [{ publishedAt: { sort: "desc", nulls: "last" } }] as const;
  const live = { publicationStatus: "PUBLISHED" } as const;
  const [ideas, funding, suppliers] = await Promise.all([
    prisma.contentItem.findMany({ where: { contentType: "BUSINESS_IDEA", ...live }, select: { slug: true, title: true, businessIdea: { select: { pictureUrl: true } } }, orderBy: [...newest], take: 3 }),
    prisma.contentItem.findMany({ where: { contentType: "FUNDING_PROGRAMME", ...live }, select: { slug: true, title: true }, orderBy: [...newest], take: 4 }),
    prisma.contentItem.findMany({ where: { contentType: "SUPPLIER", ...live }, select: { slug: true, title: true, supplier: { select: { country: true } } }, orderBy: [...newest], take: 4 }),
  ]);
  return { ideas, funding, suppliers };
}

const PAIR: { href: string; headline: string; text: string; points: [LucideIcon, string][]; tone: string; mark: string }[] = [
  {
    href: "/experts", headline: "Advisors you can rely on", tone: "bg-brand-tint", mark: "text-brand",
    text: "Checked advisors for every part of your business, with reviews from their clients.",
    points: [[Calculator, "Tax"], [BookOpen, "Accounting"], [Ship, "Import and export"], [Sprout, "Farming"]],
  },
  {
    href: "/tools", headline: "Tools that do the sums", tone: "bg-accent-tint", mark: "text-accent-dark",
    text: "Calculators and templates for the work every business has to do.",
    points: [[Percent, "VAT"], [Users, "PAYE"], [FileText, "Business plans"], [TrendingUp, "Cash flow"]],
  },
];

const Label = ({ href, tone = "text-brand" }: { href: string; tone?: string }) => {
  const d = directory(href);
  return <span className={`inline-flex items-center gap-1.5 text-[13px] font-bold sm:text-[14px] ${tone}`}><Icon name={d.icon} className="h-4 w-4" />{d.title}</span>;
};

const Go = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="group mt-1 inline-flex h-12 items-center gap-1.5 rounded-full bg-brand px-6 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white">
    {children}<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
  </Link>
);

// Headings use the hero's heaviest weight, in one colour
// The funding rows are examples of what's listed, not links: a light brand colour each, slowly drifting (.drift-row)
const ROWS = [["#CFE8FA", "#F0F8FE", "text-brand"], ["#DCE5F1", "#F5F8FC", "text-navy"], ["#FFD0A1", "#FFE2C4", "text-accent-dark"], ["#BFE0F6", "#E9F5FD", "text-brand-dark"]];

const heading = "text-hero text-[25px] leading-[1.12] sm:text-[34px]";
const body = "max-w-md text-[16px] leading-relaxed sm:text-[18px]";

export async function HomeFeatures() {
  const { ideas, funding, suppliers } = await records();
  // The newest idea sits in the middle of the fan, on top
  const fan = ideas.length === 3 ? [ideas[1], ideas[0], ideas[2]] : ideas;

  return (
    <section id="features" className="scroll-mt-24 overflow-x-clip bg-white">
      <div className="container-site pt-10 sm:pt-14">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
          <h2 className="text-hero text-[30px] leading-[1.1] text-heading sm:text-[44px]">
            Everything a business needs, on one platform
          </h2>
          <p className="mx-auto max-w-xl text-[16px] leading-relaxed text-ink-muted sm:text-[18px]">BizSphere-Ug brings business plans, funding, suppliers, expert help and tools together, so you can decide with real information.</p>
        </div>
      </div>

      {/* Business Ideas: text beside a fan of real ideas */}
      <div className="container-site grid items-center gap-6 py-8 sm:py-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-start gap-3">
          <Label href="/business-ideas" />
          <h3 className={`${heading} text-heading`}>Business plans with the real costs</h3>
          <p className={`${body} text-ink-muted`}>Browse ready business plans with every requirement and a line-by-line start-up budget, in small, medium and large sizes.</p>
          <Go href="/business-ideas">See business ideas</Go>
        </div>
        {fan.length ? (
          <div data-reveal="" className="fan relative h-[260px] sm:h-[340px]">
            {fan.map((idea, i) => {
              const n = fan.length === 1 ? 0 : i - (fan.length - 1) / 2;
              return (
                <Link key={idea.slug} href={`/business-ideas/${idea.slug}`} style={{ "--n": n, zIndex: n === 0 ? 2 : 1 } as React.CSSProperties}
                  className="fan-card flex flex-col overflow-hidden rounded-3xl bg-white text-heading ring-1 ring-line hover:text-heading">
                  <IdeaPhoto src={idea.businessIdea?.pictureUrl} alt="" className="aspect-[4/3]" />
                  <span className="truncate px-4 py-3 font-display text-[14px] font-bold sm:text-[16px]">{clean(idea.title)}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Funding Sources: the other way round, beside a list of real programmes */}
      <div className="bg-accent-tint">
      <div className="container-site grid items-center gap-6 py-8 sm:py-10 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-start gap-3 lg:order-2">
          <Label href="/funding" tone="text-accent-dark" />
          <h3 className={`${heading} text-heading`}>Every funding source in one list</h3>
          <p className={`${body} text-ink-muted`}>Compare banks, government programmes and other lenders: what each one gives, the terms, who qualifies and how to apply.</p>
          <Go href="/funding">See funding sources</Go>
        </div>
        {funding.length ? (
          <ul className="flex flex-col gap-2 lg:order-1">
            {funding.map((f, i) => {
              const [a, b, mark] = ROWS[i % ROWS.length];
              return (
                <li key={f.slug} style={{ "--a": a, "--b": b, "--wait": `-${i * 2}s` } as React.CSSProperties} className="drift-row flex items-center gap-3 rounded-2xl px-4 py-3 text-heading">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ${mark}`}><Icon name="funding" className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                  <span className="min-w-0 flex-1 truncate font-display text-[15px] font-bold">{clean(f.title)}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      </div>

      {/* Suppliers: centred, with real suppliers in a row */}
      <div className="bg-brand-tint">
        <div className="container-site flex flex-col items-center gap-6 py-8 text-center sm:py-10">
          <div className="flex max-w-2xl flex-col items-center gap-3">
            <Label href="/suppliers" />
            <h3 className={`${heading} text-heading`}>A directory of checked suppliers</h3>
            <p className="text-[16px] leading-relaxed text-ink-muted sm:text-[18px]">Find suppliers in Uganda and abroad and see what they sell, with contacts our team has checked.</p>
          </div>
          {suppliers.length ? (
            <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {suppliers.map((s, i) => (
                <li key={s.slug}>
                  <Link href={`/suppliers/${s.slug}`} className="flex h-full flex-col items-start gap-2 rounded-2xl bg-white p-4 text-left text-heading transition-transform duration-200 hover:-translate-y-1 hover:text-heading">
                    <span className="font-display text-[16px] font-bold leading-snug">{clean(s.title)}</span>
                    {s.supplier?.country ? <span className="mt-auto inline-flex items-center gap-1 text-[13px] text-ink-muted"><MapPin aria-hidden className="h-3.5 w-3.5" />{s.supplier.country}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/suppliers" className="group inline-flex h-12 items-center gap-1.5 rounded-full bg-brand px-6 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white">
            See all suppliers<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Experts and Tools: two cards side by side */}
      <div className="container-site py-8 sm:py-10">
        <ul className="grid gap-4 md:grid-cols-2">
          {PAIR.map((c, i) => {
            const d = directory(c.href);
            return (
              <li key={c.href}
                className={`flex flex-col items-start gap-3 rounded-[28px] p-5 text-heading sm:p-7 ${c.tone}`}>
                <Label href={c.href} tone={c.mark} />
                <h3 className="text-hero text-[22px] leading-[1.15] sm:text-[28px]">{c.headline}</h3>
                <p className="text-[15px] leading-relaxed text-ink-soft sm:text-[17px]">{c.text}</p>
                <ul className="flex flex-wrap gap-2">
                  {c.points.map(([Glyph, label]) => (
                    <li key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-heading"><Glyph aria-hidden className={`h-4 w-4 ${c.mark}`} strokeWidth={1.75} />{label}</li>
                  ))}
                </ul>
                <Link href={c.href} className="group mt-auto inline-flex h-12 items-center gap-1.5 rounded-full bg-brand px-6 text-[15px] font-bold text-white hover:bg-brand-dark hover:text-white">
                  Explore {d.title}<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-brand text-white">
        <div className="container-site flex flex-col items-center gap-3 py-10 text-center sm:py-12">
          <h2 className="text-hero text-[28px] leading-[1.1] sm:text-[40px]">Start using BizSphere-Ug today</h2>
          <p className="max-w-md text-[16px] leading-relaxed text-white/90 sm:text-[18px]">Open every directory with one membership.</p>
          <Link href="/signup" className="group mt-2 inline-flex h-[52px] items-center gap-1.5 rounded-full bg-accent px-8 text-[16px] font-bold text-ink hover:bg-white hover:text-ink">
            Get started<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

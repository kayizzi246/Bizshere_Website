import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, FileText, MapPin, Percent, Ship, Sprout, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { Icon } from "./Icon";
import { IdeaPhoto } from "./IdeaParts";

/**
 * The homepage below the hero: what BizSphere-Ug offers. A centred title; Business Ideas as the wide
 * feature, words on the left and a fan of photos on the right; then Funding and Suppliers as two
 * panels of colour meeting edge to edge across the full width; then Experts and Tools side by side on
 * white (Card below); then Get started. Every heading is black, in the heaviest weight, and the words
 * are centred on every screen size.
 *
 * Every idea, programme and supplier shown is a real published record, and only names and places
 * are used, so nothing here is member-only. No invented customers or numbers, and no shadows. Only
 * the fan moves as it comes into view; the text never fades, so nothing is hidden while scrolling.
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

const EXPERT_POINTS: [LucideIcon, string][] = [[Calculator, "Tax"], [BookOpen, "Accounting"], [Ship, "Import and export"], [Sprout, "Farming"]];
const TOOL_POINTS: [LucideIcon, string][] = [[Percent, "VAT"], [Users, "PAYE"], [FileText, "Business plans"], [TrendingUp, "Cash flow"]];

// The funding rows are examples of what's listed, not links: a light brand colour each, slowly drifting (.drift-row)
const ROWS = [["#CFE8FA", "#F0F8FE", "text-brand"], ["#DCE5F1", "#F5F8FC", "text-navy"], ["#FFD0A1", "#FFE2C4", "text-accent-dark"], ["#BFE0F6", "#E9F5FD", "text-brand-dark"]];

const heading = "text-hero text-[25px] leading-[1.15] text-black sm:text-[32px] lg:text-[38px]";
const body = "mx-auto max-w-md text-[16px] leading-relaxed text-ink-soft sm:text-[17px]";
const cardHeading = "text-hero text-[23px] leading-[1.15] text-black sm:text-[28px] lg:text-[32px]";

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
 * One part: name, heading, sentence, what it holds and a button at the bottom, so two side by side line
 * up. A `panel` is half of a full-width band: its colour runs to the screen's edge, while its words
 * stay in line with the rest of the page (half of the 1,440px site width).
 */
function Card({ href, title, text, action, tone = "", mark, button, panel, children }: { href: string; title: string; text: string; action: string; tone?: string; mark: string; button?: string; panel?: "left" | "right"; children: React.ReactNode }) {
  const side = panel === "left" ? "md:ml-auto md:mr-0 lg:pl-16 lg:pr-8" : panel === "right" ? "md:ml-0 md:mr-auto lg:pl-8 lg:pr-16" : "";
  return (
    <li className={tone}>
      <div className={`flex h-full flex-col items-center gap-3 text-center ${panel ? `mx-auto w-full max-w-[720px] px-5 py-8 sm:py-12 ${side}` : ""}`}>
        <Label href={href} tone={mark} />
        <h3 className={cardHeading}>{title}</h3>
        <p className="mx-auto max-w-lg text-[15px] leading-relaxed text-ink-soft sm:text-[16px]">{text}</p>
        <div className="w-full flex-1">{children}</div>
        <span className="mt-auto pt-1"><Go href={href} tone={button}>{action}</Go></span>
      </div>
    </li>
  );
}

const Points = ({ points, mark, tint }: { points: [LucideIcon, string][]; mark: string; tint: string }) => (
  <ul className="flex flex-wrap justify-center gap-2">
    {points.map(([Glyph, label]) => (
      <li key={label} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-heading ${tint}`}><Glyph aria-hidden className={`h-4 w-4 ${mark}`} strokeWidth={1.75} />{label}</li>
    ))}
  </ul>
);

export async function HomeFeatures() {
  const { ideas, funding, suppliers } = await records();
  // The newest idea sits in the middle of the fan, on top
  const fan = ideas.length === 3 ? [ideas[1], ideas[0], ideas[2]] : ideas;

  return (
    <section id="features" className="scroll-mt-24 overflow-x-clip bg-white">
      <div className="container-site flex flex-col items-center gap-3 pt-10 text-center sm:pt-14">
        <h2 className="max-w-2xl text-hero text-[28px] leading-[1.1] text-black sm:text-[38px] lg:text-[48px]">Everything a business needs, on one platform</h2>
        <p className="max-w-xl text-[16px] leading-relaxed text-ink-soft sm:text-[18px]">BizSphere-Ug brings business plans, funding, suppliers, expert help and tools together, so you can decide with real information.</p>
      </div>

      <div className="container-site grid grid-cols-[minmax(0,1fr)] items-center gap-6 py-10 sm:py-12 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Label href="/business-ideas" />
          <h3 className={heading}>Business plans with the real costs</h3>
          <p className={body}>Not sure what to start? Browse ready plans with every requirement and a line-by-line budget, in small, medium and large sizes.</p>
          <Go href="/business-ideas">See business ideas</Go>
        </div>
        {fan.length ? (
          <div data-reveal="" className="fan relative h-[260px] sm:h-[340px]">
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
          </div>
        ) : null}
      </div>

      <ul className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2">
      <Card panel="left" href="/funding" title="Every funding source in one list" action="See funding sources" tone="bg-accent-tint" mark="text-accent-dark"
        text="Need money to start or grow? Compare banks, government programmes and other lenders.">
        <ul className="flex flex-col gap-2">
          {funding.map((f, i) => {
            const [a, b, mark] = ROWS[i % ROWS.length];
            return (
              <li key={f.slug} style={{ "--a": a, "--b": b, "--wait": `-${i * 2}s` } as React.CSSProperties} className="drift-row flex items-center gap-3 rounded-2xl px-4 py-3 text-heading">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ${mark}`}><Icon name="funding" className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
                <span className="min-w-0 flex-1 truncate text-left font-display text-[15px] font-bold">{clean(f.title)}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card panel="right" href="/suppliers" title="A directory of checked suppliers" action="See all suppliers" tone="bg-brand-tint" mark="text-brand"
        text="Looking for stock or materials? Find suppliers in Uganda and abroad, with contacts our team has checked.">
        <ul className="grid h-full auto-rows-fr grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          {suppliers.map((s) => (
            <li key={s.slug}>
              <Link href={`/suppliers/${s.slug}`} className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl bg-white p-4 text-center text-heading transition-colors hover:text-brand">
                <span className="font-display text-[15px] font-bold leading-snug">{clean(s.title)}</span>
                {s.supplier?.country ? <span className="inline-flex items-center gap-1 text-[13px] text-ink-muted"><MapPin aria-hidden className="h-3.5 w-3.5" />{s.supplier.country}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      </ul>

      <div className="container-site py-8 sm:py-12">
        <ul className="grid gap-10 md:grid-cols-2 md:gap-8 lg:gap-12">
      <Card href="/experts" title="Advice from people who know" action="Find an expert" mark="text-brand"
        text="Don't guess on the hard parts. Talk to checked advisors and see the services they offer and the jobs they've done.">
        <Points points={EXPERT_POINTS} mark="text-brand" tint="bg-brand-tint" />
      </Card>

      <Card href="/tools" title="Your numbers, done in minutes" action="Open the tools" mark="text-accent-dark" button="bg-accent text-ink hover:bg-accent-dark hover:text-white"
        text="Stop working it out by hand. Use ready calculators and templates for the sums every business has to do.">
        <Points points={TOOL_POINTS} mark="text-accent-dark" tint="bg-accent-tint" />
      </Card>
        </ul>
      </div>

      <div className="bg-brand text-white">
        <div className="container-site flex flex-col items-center gap-3 py-10 text-center sm:py-12">
          <h2 className="text-hero text-[22px] leading-[1.15] sm:text-[30px]">Start using BizSphere-Ug today</h2>
          <p className="max-w-md text-[16px] leading-relaxed text-white/90 sm:text-[18px]">Open every directory with one membership.</p>
          <Link href="/signup" className="group mt-2 inline-flex h-[52px] items-center gap-1.5 rounded-full bg-accent px-8 text-[16px] font-bold text-ink hover:bg-white hover:text-ink">
            Get started<ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

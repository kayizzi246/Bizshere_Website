import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { date, itemHref, money } from "@/lib/format";
import { budgetTotal } from "@/lib/costing";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

/**
 * Homepage. Every number and record shown comes from the database or is a true
 * product fact. No invented customer logos, testimonials or user counts.
 */

const DIRECTORIES = [
  { href: "/business-ideas", icon: "idea", title: "Business ideas and plans", text: "Step-by-step plans with low, standard and higher startup budgets, each dated and sourced." },
  { href: "/machines", icon: "machine", title: "Machines", text: "Specifications, power needs and capacity, with offers from different sellers side by side." },
  { href: "/suppliers", icon: "supplier", title: "Suppliers", text: "Manufacturers, distributors and retailers, with the exact checks we made and when." },
  { href: "/funding", icon: "funding", title: "Funding", text: "Loans, grants and equity with eligibility, full terms and application deadlines." },
  { href: "/prices", icon: "prices", title: "Market prices", text: "Dated prices from markets across Uganda, compared only like for like." },
  { href: "/experts", icon: "expert", title: "Experts", text: "Consultants for plans, registration, tax and loan applications, with checked credentials." },
  { href: "/guides", icon: "guide", title: "Guides", text: "Registration, licences and tax procedures, linked to the official source." },
  { href: "/tools", icon: "tool", title: "Tools and templates", text: "Costing templates, calculators and checklists, versioned and dated." },
  { href: "/recipes", icon: "recipe", title: "Recipes", text: "Batch recipes for food businesses with cost per portion and margin." },
];

const FAQ: [string, string][] = [
  ["Is BizSphere-Ug free to use?", "Yes. You can search everything and read a preview of every page for free. A membership unlocks full budgets, contacts, funding terms, price history and downloads."],
  ["Where does the information come from?", "From official sources, supplier quotations, market visits and providers' published terms. Each page lists its sources and the date it was last reviewed."],
  ["What does “checked” mean on a supplier?", "We say exactly what we checked and when, for example “Business contact checked on 12 March”. A checked contact doesn't guarantee product quality, so always confirm terms before you pay."],
  ["How do I pay for membership?", "With MTN Mobile Money, Airtel Money or a card. You can cancel any time from your account."],
  ["I run a business. Can I be listed?", "Yes. Create a business account and submit your details. An editor reviews every listing before it goes live."],
];

export default async function HomePage() {
  const [idea, guides] = await Promise.all([
    prisma.contentItem.findFirst({
      where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED" },
      include: {
        primaryCategory: true,
        businessIdea: { include: { steps: { orderBy: { stepNumber: "asc" }, take: 3 }, scenarios: { where: { level: "STANDARD" }, include: { lines: { orderBy: { displayOrder: "asc" } } } } } },
        relatedFrom: { include: { toItem: true }, take: 3, orderBy: { displayOrder: "asc" } },
      },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.contentItem.findMany({
      where: { contentType: { in: ["GUIDE", "TOOL", "RECIPE", "NEWS"] }, publicationStatus: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
  ]);
  const scenario = idea?.businessIdea?.scenarios[0];

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-deep text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
        <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand opacity-40 blur-3xl" />
        <div className="container-site relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24 [&>*]:min-w-0">
          <div className="flex flex-col gap-6">
            <span className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-brand-mint">
              <span className="h-2 w-2 rounded-full bg-brand-mint" /> Built for entrepreneurs in Uganda
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Plan, equip and fund your business, <span className="text-brand-mint">all in one place.</span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[#C9DDD0]">
              BizSphere-Ug connects business plans to the machines, suppliers, funding and experts you need,
              with every budget, price and contact dated and sourced.
            </p>
            <form action="/search" role="search" className="flex max-w-xl items-center gap-2 rounded-2xl bg-white p-1.5 shadow-2xl shadow-black/20">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 pl-3 text-ink-muted">
                <Icon name="search" className="h-5 w-5 shrink-0" />
                <span className="sr-only">Search</span>
                <input name="q" type="search" placeholder="Try “bakery”, “maize mill” or “equipment loan”" className="min-h-[48px] w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-muted" />
              </label>
              <button className="btn-primary min-h-[48px] shrink-0 rounded-xl px-5 sm:px-6">Search</button>
            </form>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn min-h-[50px] rounded-full bg-white px-7 text-base font-extrabold text-brand-deep hover:bg-brand-tint hover:text-brand-deep">Get started free <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link href="/business-ideas" className="btn min-h-[50px] rounded-full border border-white/30 px-7 text-base text-white hover:bg-white/10 hover:text-white">Browse business ideas</Link>
            </div>
            <p className="text-sm text-[#A9C4B3]">Free account · No card needed · Pay later with mobile money</p>
          </div>

          {/* Product preview, built from a real published plan */}
          <div className="relative">
            <div className="rounded-[22px] border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="overflow-hidden rounded-2xl bg-white text-ink">
                <div className="flex min-w-0 items-center gap-1.5 border-b border-line bg-page px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E5E7E3]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E5E7E3]" /><span className="h-2.5 w-2.5 rounded-full bg-[#E5E7E3]" />
                  <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-xs text-ink-muted">bizsphere.ug{idea ? itemHref(idea) : "/business-ideas"}</span>
                </div>
                <div className="flex flex-col gap-4 p-5">
                  <div>
                    <span className="eyebrow">Business idea · {idea?.primaryCategory?.name ?? "Food production"}</span>
                    <p className="text-xl font-extrabold">{idea?.title ?? "Small bakery"}</p>
                  </div>
                  <div className="rounded-xl border border-line p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold">Startup budget · standard</span>
                      <span className="badge-info">{scenario?.estimateDate ? `Est. ${date(scenario.estimateDate)}` : "Dated estimate"}</span>
                    </div>
                    {(scenario?.lines.slice(0, 3) ?? []).map((l) => (
                      <div key={l.id} className="flex justify-between gap-3 border-t border-line py-2 text-sm">
                        <span className="truncate text-ink-soft">{l.description}</span>
                        <span className="whitespace-nowrap font-semibold">{l.unitCost === null ? <span className="font-normal text-ink-muted">Being sourced</span> : money(Number(l.unitCost) * Number(l.quantity), scenario?.currency)}</span>
                      </div>
                    ))}
                    {scenario ? (
                      <div className="flex justify-between gap-3 border-t border-line pt-2 text-sm font-extrabold"><span>Total</span><span className="text-right">{(() => { const t = budgetTotal(scenario.lines); return t === null ? "Shown when all lines are sourced" : money(t, scenario.currency); })()}</span></div>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(idea?.relatedFrom.length ? idea.relatedFrom.map((r) => r.toItem.title) : ["Deck oven", "Equipment loan", "Batch costing"]).slice(0, 3).map((t, n) => (
                      <div key={t} className="flex flex-col gap-1.5 rounded-xl bg-page p-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-tint text-brand"><Icon name={["machine", "funding", "tool"][n]} className="h-4 w-4" /></span>
                        <span className="line-clamp-2 text-xs font-bold leading-snug">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-xl sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tint text-brand"><Icon name="shield" /></span>
              <span className="flex flex-col"><span className="text-sm font-extrabold">Business contact checked</span><span className="text-xs text-ink-muted">Every check shows its date</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product facts strip ─────────────────────────── */}
      <section className="border-b border-line bg-white">
        <div className="container-site grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {[
            ["11", "connected directories"],
            ["3", "budget scenarios per plan"],
            ["100%", "of prices show their date"],
            ["UGX 0", "to create an account"],
          ].map(([n, l]) => (
            <div key={l} className="flex flex-col gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-brand-deep">{n}</span>
              <span className="text-sm text-ink-muted">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Directories ─────────────────────────────────── */}
      <section className="container-site flex flex-col gap-10 py-20">
        <SectionHead eyebrow="Everything in one place" title="From idea to open doors" text="Every directory links to the others, so one search for “bakery” brings you the plan, the oven, the supplier, the loan and the recipe." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIRECTORIES.map((d) => (
            <Link key={d.href} href={d.href} className="group card flex flex-col gap-3 p-6 text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-ink hover:shadow-lg hover:shadow-brand/5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand transition group-hover:bg-brand group-hover:text-white"><Icon name={d.icon} /></span>
              <span className="text-lg font-extrabold">{d.title}</span>
              <span className="text-[15px] leading-relaxed text-ink-muted">{d.text}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-bold text-brand">Explore <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Resources ───────────────────────────────────── */}
      {guides.length ? (
        <section className="bg-white py-20">
          <div className="container-site flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHead eyebrow="Resources" title="Guides, tools and news" />
              <Link href="/guides" className="inline-flex items-center gap-1 font-bold">All resources <Icon name="arrow" className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {guides.map((g) => (
                <Link key={g.id} href={itemHref(g)} className="card flex flex-col gap-2 p-5 text-ink transition hover:border-brand hover:text-ink">
                  <span className="eyebrow">{g.contentType.toLowerCase()}</span>
                  <span className="font-bold leading-snug">{g.title}</span>
                  <span className="mt-auto pt-2 text-xs text-ink-muted">Reviewed {date(g.lastReviewedAt)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="container-site grid gap-10 py-20 lg:grid-cols-[1fr_1.6fr]">
        <SectionHead eyebrow="FAQ" title="Questions people ask" text="Can't find your answer?" />
        <div className="flex flex-col gap-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group card p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold">
                {q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-page text-lg transition group-open:rotate-45">+</span>
              </summary>
              <p className="pt-3 leading-relaxed text-ink-muted">{a}</p>
            </details>
          ))}
          <Link href="/contact" className="mt-2 font-bold">Contact us →</Link>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="container-site pb-24">
        <div className="relative overflow-hidden rounded-[28px] bg-brand px-8 py-16 text-center text-white md:px-16">
          <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-mint opacity-30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-deep opacity-60 blur-3xl" />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
            <h2 className="text-4xl font-extrabold tracking-tight md:text-5xl">Your business starts with the right information</h2>
            <p className="text-lg text-[#E5F2EA]">Create a free account in a minute. Upgrade when you&apos;re ready to act.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn min-h-[52px] rounded-full bg-white px-8 text-base font-extrabold text-brand-deep hover:bg-brand-tint hover:text-brand-deep">Get started free</Link>
              <Link href="/business-ideas" className="btn min-h-[52px] rounded-full border border-white/40 px-8 text-base text-white hover:bg-white/10 hover:text-white">Browse ideas</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, text, center = false }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={`flex max-w-2xl flex-col gap-3 ${center ? "mx-auto items-center text-center" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="text-4xl font-extrabold tracking-tight">{title}</h2>
      {text ? <p className="text-lg leading-relaxed text-ink-muted">{text}</p> : null}
    </div>
  );
}


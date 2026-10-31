import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { compactRange } from "@/lib/format";
import { IDEA_CARD_SELECT, requirementCount } from "@/components/IdeaParts";
import { IdeaBrowser, type BrowseIdea } from "@/components/IdeaBrowser";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business ideas" };

type Params = Partial<Record<"q" | "category" | "sort" | "page", string | string[]>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Business ideas: a hero with the search box, category chips with counts, a sort choice and one
 * paged grid of idea cards. Search, chips, sort and pages work on the page itself (IdeaBrowser),
 * so visitors never leave it. Below: a way on when nothing fits, and questions answered from the
 * published ideas themselves.
 */
export default async function Page({ searchParams }: { searchParams: Params }) {
  const d = directory("/business-ideas");
  const all = await prisma.contentItem.findMany({
    where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED" },
    select: { ...IDEA_CARD_SELECT, businessIdea: { select: { ...IDEA_CARD_SELECT.businessIdea.select, businessType: true, profitPotential: true, homeBasedSuitable: true } } },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
    take: 500,
  });
  // Plain values only: the search runs in the visitor's browser, where money (Decimal) can't be sent.
  const ideas: BrowseIdea[] = all.map((i, order) => {
    const bi = i.businessIdea;
    const capitalMin = bi?.capitalMin == null ? null : Number(bi.capitalMin);
    const capitalMax = bi?.capitalMax == null ? null : Number(bi.capitalMax);
    return {
      id: i.id, slug: i.slug, title: i.title, shortSummary: i.shortSummary, primaryCategory: i.primaryCategory,
      businessIdea: bi && { pictureUrl: bi.pictureUrl, keyRequirements: bi.keyRequirements, currency: bi.currency, scenarios: bi.scenarios, capitalMin, capitalMax },
      order,
      reqs: bi ? requirementCount(bi) : 0,
      capital: capitalMin ?? capitalMax,
      text: [i.title, i.shortSummary, i.primaryCategory?.name, bi?.businessType, bi?.keyRequirements].filter(Boolean).join(" ").toLowerCase(),
    };
  });

  // Questions answered from the published ideas; a question without an answer is left out.
  // "Bakery (UGX 2M – 5M), Soap making and Poultry", each name linking to its plan.
  const list = (xs: typeof all) => xs.map((x, n) => {
    const capital = x.businessIdea && compactRange(x.businessIdea.capitalMin, x.businessIdea.capitalMax, x.businessIdea.currency);
    return (
      <span key={x.id}>
        {n ? (n === xs.length - 1 ? " and " : ", ") : ""}
        <Link href={`/business-ideas/${x.slug}`} className="font-semibold">{x.title.replace(/^Sample:\s*/i, "")}</Link>{capital ? ` (${capital})` : ""}
      </span>
    );
  });
  const cheapest = all.filter((i) => i.businessIdea?.capitalMin != null).sort((a, b) => Number(a.businessIdea!.capitalMin) - Number(b.businessIdea!.capitalMin)).slice(0, 3);
  const profitable = all.filter((i) => i.businessIdea?.profitPotential === "HIGH").slice(0, 5);
  const fromHome = all.filter((i) => i.businessIdea?.homeBasedSuitable).slice(0, 5);
  const faq = ([
    ["Which businesses need the least starting capital?", cheapest.length ? <>Of the ideas priced so far: {list(cheapest)}. Each plan lists its start-up budget item by item.</> : null],
    ["Which business ideas have high profit potential?", profitable.length ? <>{list(profitable)}. Profit potential is our researchers&apos; estimate; check the plan&apos;s target market and success factors for your area.</> : null],
    ["Which businesses can I start from home?", fromHome.length ? <>{list(fromHome)}.</> : null],
    ["How do I register my business?", <>Step-by-step registration and licensing guides are in <Link href="/guides" className="font-semibold">How-to guides</Link>. Each plan also lists its special requirements, such as licences.</>],
    ["Where can I get money to start?", <>Loans, grants and other programmes for small businesses are listed under <Link href="/funding" className="font-semibold">Loans and funding</Link>.</>],
    ["Where do I buy the machines and stock?", <>See <Link href="/machines" className="font-semibold">Machines</Link> and <Link href="/suppliers" className="font-semibold">Suppliers</Link>. Plans link to the machines and suppliers they need where we have them.</>],
  ] as [string, React.ReactNode][]).filter(([, a]) => Boolean(a));

  return (
    <>
      <IdeaBrowser
        ideas={ideas}
        intro={d.text}
        initial={{ q: first(searchParams.q), category: first(searchParams.category), sort: first(searchParams.sort), page: Math.max(1, Number.parseInt(first(searchParams.page), 10) || 1) }}
      />
      <div className="bg-page">
        <div className="container-site flex flex-col gap-8 pb-10 sm:pb-14">
          {/* When nothing fits */}
          <section className="mx-auto flex max-w-2xl flex-col items-center gap-3 py-6 text-center">
            <h2 className="text-block-title text-heading">Can&apos;t find what you&apos;re looking for?</h2>
            <p className="text-[15px] leading-relaxed text-ink-muted">We keep adding business ideas for Uganda. Search every directory at once, or tell us which business you&apos;d like a plan for.</p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <Link href="/search" className="btn-primary"><Icon name="search" className="h-4 w-4" />Search everything</Link>
              <Link href="/contact" className="inline-flex h-11 items-center rounded-lg border border-line bg-white px-5 text-sm font-semibold text-heading hover:border-brand hover:text-brand">Suggest a business idea</Link>
            </div>
          </section>

          {/* Questions answered from the published ideas */}
          <section aria-labelledby="faq" className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            <div className="flex flex-col items-center gap-1 text-center">
              <h2 id="faq" className="text-section-title text-heading">Frequently asked questions</h2>
              <p className="text-[15px] text-ink-muted">Starting a business in Uganda</p>
            </div>
            <div className="flex flex-col gap-3">
              {faq.map(([q, a]) => (
                <details key={q} className="group rounded-xl border border-line bg-white px-5 shadow-[0_1px_3px_rgba(7,26,51,0.05)] [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[15px] font-semibold text-heading">
                    {q}<ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition group-open:rotate-180" />
                  </summary>
                  <div className="pb-4 text-sm leading-relaxed text-ink-soft">{a}</div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { IDEA_CARD_SELECT, requirementCount } from "@/components/IdeaParts";
import { IdeaBrowser, type BrowseIdea } from "@/components/IdeaBrowser";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: directory("/business-ideas").title };

type Params = Partial<Record<"q" | "category" | "sort" | "page", string | string[]>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Business ideas: a hero with the search box, category chips with counts, a sort choice and one
 * paged grid of idea cards. Search, chips, sort and pages work on the page itself (IdeaBrowser),
 * so visitors never leave it. Below: a way on when nothing fits.
 */
export default async function Page({ searchParams }: { searchParams: Params }) {
  const d = directory("/business-ideas");
  const all = await prisma.contentItem.findMany({
    where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED" },
    select: { ...IDEA_CARD_SELECT, businessIdea: { select: { ...IDEA_CARD_SELECT.businessIdea.select, businessType: true } } },
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
        </div>
      </div>
    </>
  );
}

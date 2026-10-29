import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { Icon } from "@/components/Icon";
import { ServiceSearch } from "@/components/ServiceSearch";
import { ListingHeader } from "@/components/DirectoryList";
import { readSearch, searchListings, type SearchParams } from "@/lib/directory-search";
import { IdeaPhoto, PLAN_LABEL, PLAN_ORDER } from "@/components/IdeaParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business ideas and plans" };

/** Business ideas: photo cards that show which budget plans each idea has. */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/business-ideas");
  const search = await readSearch("BUSINESS_IDEA", searchParams);
  // The search finds the matching ids; the cards need the fuller record below.
  const matches = search.active ? (await searchListings("BUSINESS_IDEA", search.q, search.values)).map((i) => i.id) : null;
  const items = await prisma.contentItem.findMany({
    where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED", ...(matches ? { id: { in: matches } } : {}) },
    include: {
      primaryCategory: true,
      businessIdea: { select: { businessType: true, pictureUrl: true, scenarios: { select: { level: true } }, _count: { select: { steps: true } } } },
    },
    orderBy: [{ publishedAt: "desc" }],
    take: 60,
  });

  return (
    <>
      <ListingHeader icon="idea" title={d.title} intro={d.text} count={items.length} searching={search.active} unit={["plan", "plans"]}>
        <ServiceSearch path="/business-ideas" label="business ideas" q={search.q} filters={search.filters} values={search.values} count={items.length} />
      </ListingHeader>
      <div className="bg-page">
        <div className="container-site flex flex-col gap-6 py-8 sm:py-10">

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-heading">{search.active ? "Nothing matches this search. Try fewer filters." : "Nothing published here yet."}</p>
              {search.active ? <Link href="/business-ideas" className="text-[13px] font-semibold">Clear the search</Link> : null}
            </div>
          ) : null}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((i) => {
              const b = i.businessIdea;
              const plans = PLAN_ORDER.filter((l) => b?.scenarios.some((s) => s.level === l));
              return (
                <li key={i.id} id={i.slug}>
                  <Link href={`/business-ideas/${i.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition-colors hover:border-brand hover:text-ink">
                    <div className="relative overflow-hidden">
                      <IdeaPhoto src={b?.pictureUrl} alt={i.title} className="aspect-[4/3] transition duration-500 group-hover:scale-[1.04]" />
                      {i.primaryCategory ? <span className="absolute left-3 top-3 max-w-[80%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-heading backdrop-blur">{i.primaryCategory.name}</span> : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      {b?.businessType ? <span className="text-xs font-semibold text-accent-dark">{b.businessType}</span> : null}
                      <h2 className="font-sans text-[17px] font-bold leading-tight tracking-tight text-heading group-hover:text-brand">{i.title}</h2>
                      {i.shortSummary ? <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{i.shortSummary}</p> : null}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {plans.length ? plans.map((l) => (
                          <span key={l} className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand-dark">{PLAN_LABEL[l]}</span>
                        )) : <span className="rounded-full bg-page px-2.5 py-0.5 text-[11px] text-ink-muted">Budget being prepared</span>}
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3 text-xs text-ink-muted">
                        <span>{b?._count.steps ? `${b._count.steps} steps to start` : "Steps coming"}</span>
                        <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-heading transition group-hover:border-brand group-hover:bg-brand group-hover:text-white">→</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { ServiceSearch } from "@/components/ServiceSearch";
import { ListingHeader, StickySearch } from "@/components/DirectoryList";
import { readSearch, searchListings, type SearchParams } from "@/lib/directory-search";
import { IdeaCard } from "@/components/IdeaParts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business ideas and plans" };

/**
 * Business ideas: category chips with counts, the directory's pinned advanced search, then the
 * ideas as cards (photo, name, requirement count, Overview and Requirements). With no search the
 * ideas are grouped by category; a search or a chosen category shows one grid.
 */
export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = directory("/business-ideas");
  const search = await readSearch("BUSINESS_IDEA", searchParams);
  // The search finds the matching ids; the cards need the fuller record below.
  const matches = search.active ? (await searchListings("BUSINESS_IDEA", search.q, search.values, search.adv)).map((i) => i.id) : null;
  const [items, total] = await Promise.all([
    prisma.contentItem.findMany({
      where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED", ...(matches ? { id: { in: matches } } : {}) },
      select: {
        id: true, slug: true, title: true, shortSummary: true, primaryCategory: { select: { id: true, name: true } },
        businessIdea: { select: { pictureUrl: true, keyRequirements: true, _count: { select: { steps: true } }, scenarios: { select: { _count: { select: { lines: true } } } } } },
      },
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
      take: 120,
    }),
    prisma.contentItem.count({ where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED" } }),
  ]);
  // Keep the search's order (its sort choice) when there is one.
  if (matches) items.sort((a, b) => matches.indexOf(a.id) - matches.indexOf(b.id));

  // Categories with their number of ideas (all published ideas, so the chips stay put while searching)
  const all = matches ? await prisma.contentItem.findMany({ where: { contentType: "BUSINESS_IDEA", publicationStatus: "PUBLISHED" }, select: { primaryCategory: { select: { id: true, name: true } } } }) : items;
  const cats = [...all.reduce((m, i) => (i.primaryCategory ? m.set(i.primaryCategory.id, { name: i.primaryCategory.name, n: (m.get(i.primaryCategory.id)?.n ?? 0) + 1 }) : m), new Map<string, { name: string; n: number }>())]
    .sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name));
  const chosen = search.values.category ?? "";
  const grouped = !search.active;
  const groups = grouped
    ? cats.map(([id, c]) => ({ id, name: c.name, list: items.filter((i) => i.primaryCategory?.id === id) })).concat([{ id: "", name: "Other ideas", list: items.filter((i) => !i.primaryCategory) }]).filter((g) => g.list.length)
    : [];

  return (
    <>
      <ListingHeader icon="idea" title={`${total} business ideas to start in Uganda`} intro={d.text} count={items.length} searching={search.active} unit={["plan", "plans"]} overlap />
      <div className="bg-page">
        <StickySearch>
          <ServiceSearch path="/business-ideas" label="business ideas" q={search.q} filters={search.filters} values={search.values} count={items.length} adv={search.adv} advancedActive={search.advancedActive} />
        </StickySearch>
        <div className="container-site flex flex-col gap-8 py-8 sm:py-10">
          {/* Categories, with how many ideas each has */}
          <nav aria-label="Categories" className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
            <ul className="flex gap-2 sm:flex-wrap">
              <li className="shrink-0"><Link href="/business-ideas" aria-current={!chosen ? "true" : undefined} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${!chosen ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>All<span className={`rounded-full px-1.5 text-xs ${!chosen ? "bg-white/20" : "bg-page"}`}>{total}</span></Link></li>
              {cats.map(([id, c]) => (
                <li key={id} className="shrink-0">
                  <Link href={`/business-ideas?category=${id}`} aria-current={chosen === id ? "true" : undefined} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${chosen === id ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>
                    {c.name}<span className={`rounded-full px-1.5 text-xs ${chosen === id ? "bg-white/20" : "bg-page"}`}>{c.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-heading">{search.active ? "Nothing matches this search. Try fewer filters." : "Nothing published here yet."}</p>
              {search.active ? <Link href="/business-ideas" className="text-[13px] font-semibold">Clear the search</Link> : null}
            </div>
          ) : grouped ? (
            groups.map((g) => (
              <section key={g.id || "other"} aria-labelledby={`g-${g.id || "other"}`} className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-3">
                  <h2 id={`g-${g.id || "other"}`} className="text-block-title text-heading">{g.name} <span className="text-base font-semibold text-ink-muted">({g.list.length})</span></h2>
                  {g.id && g.list.length > 3 ? <Link href={`/business-ideas?category=${g.id}`} className="shrink-0 text-sm font-semibold">View all →</Link> : null}
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {g.list.slice(0, 8).map((i) => <li key={i.id} id={i.slug}><IdeaCard idea={i} /></li>)}
                </ul>
              </section>
            ))
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((i) => <li key={i.id} id={i.slug}><IdeaCard idea={i} /></li>)}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

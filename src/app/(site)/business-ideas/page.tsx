import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { directory } from "@/config/directories";
import { compactRange } from "@/lib/format";
import { ServiceSearch } from "@/components/ServiceSearch";
import { ListingHeader, StickySearch } from "@/components/DirectoryList";
import { readSearch, searchListings, type SearchParams } from "@/lib/directory-search";
import { IDEA_CARD_SELECT, IdeaCard } from "@/components/IdeaParts";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business ideas and plans" };

const PER_PAGE = 12;

/**
 * Business ideas: the directory's pinned advanced search, category chips with counts, then one
 * paged grid of idea cards (photo, requirement count, starting capital, Overview and Requirements),
 * a way on when nothing fits, and questions answered from the published ideas themselves.
 */
export default async function Page({ searchParams }: { searchParams: SearchParams & { page?: string } }) {
  const d = directory("/business-ideas");
  const search = await readSearch("BUSINESS_IDEA", searchParams);
  // The search finds the matching ids; the cards need the fuller record below.
  const matches = search.active ? (await searchListings("BUSINESS_IDEA", search.q, search.values, search.adv)).map((i) => i.id) : null;
  const published = { contentType: "BUSINESS_IDEA" as const, publicationStatus: "PUBLISHED" as const };
  const all = await prisma.contentItem.findMany({
    where: published,
    select: { ...IDEA_CARD_SELECT, businessIdea: { select: { ...IDEA_CARD_SELECT.businessIdea.select, profitPotential: true, homeBasedSuitable: true } } },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
    take: 500,
  });
  // Keep the search's order (its sort choice) when there is one.
  const items = matches ? all.filter((i) => matches.includes(i.id)).sort((a, b) => matches.indexOf(a.id) - matches.indexOf(b.id)) : all;
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1));
  const shown = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageHref = (n: number) => {
    const p = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (k === "page" || v == null ? [] : (Array.isArray(v) ? v : [v]).map((x) => [k, x]))));
    if (n > 1) p.set("page", String(n));
    const s = p.toString();
    return `/business-ideas${s ? `?${s}` : ""}`;
  };

  // Categories with their number of ideas (all published ideas, so the chips stay put while searching)
  const cats = [...all.reduce((m, i) => (i.primaryCategory ? m.set(i.primaryCategory.id, { name: i.primaryCategory.name, n: (m.get(i.primaryCategory.id)?.n ?? 0) + 1 }) : m), new Map<string, { name: string; n: number }>())]
    .sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name));
  const chosen = search.values.category ?? "";
  const chosenName = cats.find(([id]) => id === chosen)?.[1].name;

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
    ["How do I register my business?", <>Step-by-step registration and licensing guides are in <Link href="/guides" className="font-semibold">Business information and guidelines</Link>. Each plan also lists its special requirements, such as licences.</>],
    ["Where can I get money to start?", <>Loans, grants and other programmes for small businesses are listed under <Link href="/funding" className="font-semibold">Funding sources</Link>.</>],
    ["Where do I buy the machines and stock?", <>See <Link href="/machines" className="font-semibold">Business machines</Link> and <Link href="/suppliers" className="font-semibold">Suppliers</Link>. Plans link to the machines and suppliers they need where we have them.</>],
  ] as [string, React.ReactNode][]).filter(([, a]) => Boolean(a));

  return (
    <>
      <ListingHeader icon="idea" title={`${all.length} business ideas to start in Uganda`} intro={d.text} count={items.length} searching={search.active} unit={["plan", "plans"]} overlap />
      <div className="bg-page">
        <StickySearch>
          <ServiceSearch path="/business-ideas" label="business ideas" q={search.q} filters={search.filters} values={search.values} count={items.length} adv={search.adv} advancedActive={search.advancedActive} />
        </StickySearch>
        <div className="container-site flex flex-col gap-8 py-8 sm:py-10">
          {/* Categories, with how many ideas each has */}
          <nav aria-label="Categories" className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">Browse by category</span>
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] sm:flex-wrap">
              <li className="shrink-0"><Chip href="/business-ideas" on={!chosen} label="All" n={all.length} /></li>
              {cats.map(([id, c]) => <li key={id} className="shrink-0"><Chip href={`/business-ideas?category=${id}`} on={chosen === id} label={c.name} n={c.n} /></li>)}
            </ul>
          </nav>

          <section aria-labelledby="ideas" className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 id="ideas" className="text-section-title text-heading">{chosenName ? `${chosenName} business ideas` : search.active ? "Matching business ideas" : "Business ideas in Uganda"}</h2>
              <p className="text-sm text-ink-muted"><strong className="font-semibold text-ink-soft">{items.length} {items.length === 1 ? "business" : "businesses"} available</strong>{pages > 1 ? ` · page ${page} of ${pages}` : ""}</p>
            </div>
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
                <p className="text-sm font-semibold text-heading">{search.active ? "Nothing matches this search. Try fewer filters." : "Nothing published here yet."}</p>
                {search.active ? <Link href="/business-ideas" className="text-[13px] font-semibold">Clear the search</Link> : null}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((i) => <li key={i.id} id={i.slug}><IdeaCard idea={i} /></li>)}
              </ul>
            )}
            {pages > 1 ? (
              <nav aria-label="Pages" className="flex items-center justify-center gap-1.5 pt-2">
                <PageLink href={page > 1 ? pageHref(page - 1) : null} label="Previous page"><ChevronLeft className="h-4 w-4" /></PageLink>
                {Array.from({ length: pages }, (_, n) => n + 1).map((n) => (
                  <Link key={n} href={pageHref(n)} aria-current={n === page ? "page" : undefined}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold ${n === page ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>{n}</Link>
                ))}
                <PageLink href={page < pages ? pageHref(page + 1) : null} label="Next page"><ChevronRight className="h-4 w-4" /></PageLink>
              </nav>
            ) : null}
          </section>

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

function Chip({ href, on, label, n }: { href: string; on: boolean; label: string; n: number }) {
  return (
    <Link href={href} aria-current={on ? "true" : undefined} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>
      {label}<span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/20" : "bg-page"}`}>{n}</span>
    </Link>
  );
}

function PageLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  const cls = "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white";
  return href
    ? <Link href={href} aria-label={label} className={`${cls} text-ink-soft hover:border-brand hover:text-brand`}>{children}</Link>
    : <span aria-hidden className={`${cls} text-line-strong`}>{children}</span>;
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IdeaCard, type CardIdea } from "./IdeaParts";
import { useTypingHint } from "./TypingHint";
import { BrowseHero, CategoryChips, Pager, SortSelect, countCategories, syncAddress } from "./BrowseParts";

/** A card plus what the in-page search and sort need. `order` is the newest-first position. */
export type BrowseIdea = CardIdea & { order: number; reqs: number; capital: number | null; text: string };

const PER_PAGE = 12;
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "capital-low", label: "Lowest capital" },
  { value: "capital-high", label: "Highest capital" },
  { value: "requirements", label: "Most requirements" },
  { value: "az", label: "A to Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

const name = (i: BrowseIdea) => i.title.replace(/^Sample:\s*/i, "");
// Unpriced ideas go last whichever way capital is sorted.
const byCapital = (dir: 1 | -1) => (a: BrowseIdea, b: BrowseIdea) =>
  a.capital === null ? (b.capital === null ? 0 : 1) : b.capital === null ? -1 : dir * (a.capital - b.capital);
const SORTERS: Record<Sort, (a: BrowseIdea, b: BrowseIdea) => number> = {
  newest: (a, b) => a.order - b.order,
  "capital-low": byCapital(1),
  "capital-high": byCapital(-1),
  requirements: (a, b) => b.reqs - a.reqs || a.order - b.order,
  az: (a, b) => name(a).localeCompare(name(b)),
};

/**
 * Business ideas page body: hero with the search box, category chips, sort and the paged card grid.
 * Searching, filtering and sorting all happen on the page (no reload); the address bar keeps the
 * choices (?q=…&category=…&sort=…&page=…) so a search can be shared or bookmarked.
 */
export function IdeaBrowser({ ideas, intro, initial }: {
  ideas: BrowseIdea[];
  intro: string;
  initial: { q: string; category: string; sort: string; page: number };
}) {
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [sort, setSort] = useState<Sort>(SORTS.some((s) => s.value === initial.sort) ? (initial.sort as Sort) : "newest");
  const [page, setPage] = useState(initial.page);
  const listTop = useRef<HTMLElement>(null);

  const cats = useMemo(() => countCategories(ideas), [ideas]);

  // Every word typed must appear somewhere in the idea (name, summary, category, requirements).
  const items = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return ideas
      .filter((i) => (!category || i.primaryCategory?.id === category) && words.every((w) => i.text.includes(w)))
      .sort(SORTERS[sort]);
  }, [ideas, q, category, sort]);

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = items.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const chosenName = cats.find(([id]) => id === category)?.[1].name;
  // Examples for the search box and the "Popular" links: the newest ideas' names.
  const examples = useMemo(() => ideas.slice(0, 6).map((i) => name(i).toLowerCase()), [ideas]);
  const hint = useTypingHint(examples.length ? examples : ["bakery"], { prefix: "Search business ideas, e.g. ", paused: Boolean(q) });

  useEffect(() => syncAddress("/business-ideas", { q, category, sort, defaultSort: "newest", page: current }), [q, category, sort, current]);

  const toList = () => listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goTo = (n: number) => { setPage(n); toList(); };
  const clear = () => { setQ(""); setCategory(""); setPage(1); };

  return (
    <>
      <BrowseHero
        crumb="Business ideas"
        badge={[ideas.length, "business plans with start-up budgets"]}
        title={<>Business ideas to start in <span className="text-accent">Uganda</span> today</>}
        intro={intro}
        q={q}
        onSearch={(v) => { setQ(v); setPage(1); }}
        onSubmit={toList}
        hint={hint}
        label="Search business ideas"
        popular={examples.slice(0, 4)}
      />

      <div className="bg-page">
        <div className="container-site flex flex-col gap-8 py-8 sm:py-10">
          <CategoryChips cats={cats} total={ideas.length} chosen={category} onChoose={(id) => { setCategory(id); setPage(1); }} />

          <section ref={listTop} aria-labelledby="ideas" className="flex scroll-mt-4 flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="ideas" className="text-section-title text-heading">
                  {q.trim() ? `Results for “${q.trim()}”${chosenName ? ` in ${chosenName}` : ""}` : chosenName ? `${chosenName} business ideas` : "Top business ideas in Uganda"}
                </h2>
                <p className="text-sm text-ink-muted" aria-live="polite">
                  <strong className="font-semibold text-ink-soft">{items.length} {items.length === 1 ? "business" : "businesses"} available</strong>{pages > 1 ? ` · page ${current} of ${pages}` : ""}
                </p>
              </div>
              <SortSelect value={sort} options={SORTS} onChange={(v) => { setSort(v); setPage(1); }} />
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
                <p className="text-sm font-semibold text-heading">{ideas.length ? "No business ideas match this search. Try other words or another category." : "Nothing published here yet."}</p>
                {ideas.length ? <button type="button" onClick={clear} className="text-[13px] font-semibold text-brand hover:text-brand-dark">Clear the search</button> : null}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((i) => <li key={i.id} id={i.slug}><IdeaCard idea={i} /></li>)}
              </ul>
            )}

            <Pager current={current} pages={pages} goTo={goTo} />
          </section>
        </div>
      </div>
    </>
  );
}

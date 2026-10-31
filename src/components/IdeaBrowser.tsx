"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { IdeaCard, type CardIdea } from "./IdeaParts";

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

  // Categories with their number of ideas, most ideas first.
  const cats = useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    for (const i of ideas) if (i.primaryCategory) m.set(i.primaryCategory.id, { name: i.primaryCategory.name, n: (m.get(i.primaryCategory.id)?.n ?? 0) + 1 });
    return [...m].sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name));
  }, [ideas]);

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

  // Keep the address bar in step without reloading or adding history entries.
  useEffect(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    if (sort !== "newest") p.set("sort", sort);
    if (current > 1) p.set("page", String(current));
    const s = p.toString();
    window.history.replaceState(null, "", `/business-ideas${s ? `?${s}` : ""}`);
  }, [q, category, sort, current]);

  const goTo = (n: number) => {
    setPage(n);
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const clear = () => { setQ(""); setCategory(""); setPage(1); };

  return (
    <>
      <header className="bg-gradient-to-br from-[#071A33] to-brand-dark text-white">
        <div className="container-site flex flex-col items-center gap-5 py-12 text-center sm:py-16">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <Link href="/" className="text-white/70 hover:text-white">Home</Link> / <span className="font-semibold text-white">Business ideas in Uganda</span>
          </nav>
          <h1 className="max-w-3xl text-page-title">{ideas.length} business ideas to start in Uganda today</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-base">{intro}</p>
          <form role="search" onSubmit={(e) => { e.preventDefault(); listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="relative mt-2 w-full max-w-2xl">
            <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search business ideas (e.g. 'bakery', 'poultry', 'salon')…"
              aria-label="Search business ideas"
              className="h-14 w-full rounded-xl border-0 bg-white pl-14 pr-12 text-base text-heading shadow-[0_10px_30px_-10px_rgba(0,0,0,0.35)] outline-none placeholder:text-ink-muted focus:ring-4 focus:ring-white/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {q ? (
              <button type="button" onClick={() => { setQ(""); setPage(1); }} aria-label="Clear the search" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-page hover:text-heading">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </form>
        </div>
      </header>

      <div className="bg-page">
        <div className="container-site flex flex-col gap-8 py-8 sm:py-10">
          {/* Categories, with how many ideas each has */}
          <nav aria-label="Categories" className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">Browse by category</span>
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] sm:flex-wrap">
              <li className="shrink-0"><Chip on={!category} label="All" n={ideas.length} onClick={() => { setCategory(""); setPage(1); }} /></li>
              {cats.map(([id, c]) => <li key={id} className="shrink-0"><Chip on={category === id} label={c.name} n={c.n} onClick={() => { setCategory(id); setPage(1); }} /></li>)}
            </ul>
          </nav>

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
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <span className="sr-only sm:not-sr-only">Sort by</span>
                <select value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }} className="h-11 rounded-lg border border-line bg-white px-3 pr-8 text-sm font-semibold text-heading hover:border-brand focus:border-brand focus:outline-none">
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
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

            {pages > 1 ? (
              <nav aria-label="Pages" className="flex items-center justify-center gap-1.5 pt-2">
                <PageButton disabled={current === 1} onClick={() => goTo(current - 1)} label="Previous page"><ChevronLeft className="h-4 w-4" /></PageButton>
                {Array.from({ length: pages }, (_, n) => n + 1).map((n) => (
                  <button key={n} type="button" onClick={() => goTo(n)} aria-current={n === current ? "page" : undefined}
                    className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold ${n === current ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>{n}</button>
                ))}
                <PageButton disabled={current === pages} onClick={() => goTo(current + 1)} label="Next page"><ChevronRight className="h-4 w-4" /></PageButton>
              </nav>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}

function Chip({ on, label, n, onClick }: { on: boolean; label: string; n: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>
      {label}<span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/20" : "bg-page"}`}>{n}</span>
    </button>
  );
}

function PageButton({ disabled, onClick, label, children }: { disabled: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:border-brand hover:text-brand disabled:pointer-events-none disabled:text-line-strong">
      {children}
    </button>
  );
}

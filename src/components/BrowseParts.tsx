"use client";

import Link from "next/link";
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, Search, X } from "lucide-react";

/**
 * Shared pieces of the in-page directory browsers (IdeaBrowser, ListingBrowser): the compact
 * SaaS-style hero with its inline search bar (words, category, sort), category chips, sort menu and page numbers.
 */

export function BrowseHero<T extends string>({ title, intro, tabs, active, q, onSearch, onSubmit, hint, label, popular, cats, category, onCategory, sort, sorts, onSort }: {
  title: React.ReactNode;
  intro: string;
  /** Section tabs (e.g. Business machines | Suppliers), as [href, label] */
  tabs?: [string, string][];
  active?: string;
  q: string;
  onSearch: (v: string) => void;
  /** Enter, the Search button or a "Popular" pick: scroll to the results */
  onSubmit: () => void;
  hint: string;
  label: string;
  popular: string[];
  /** Category drop-down in the search bar (from countCategories); "" is All */
  cats: [string, { name: string; n: number }][];
  category: string;
  onCategory: (id: string) => void;
  /** Sort drop-down in the search bar */
  sort: T;
  sorts: readonly { value: T; label: string }[];
  onSort: (v: T) => void;
}) {
  const select = "h-11 w-full min-w-0 cursor-pointer appearance-none bg-transparent pl-9 pr-8 text-[14px] font-semibold text-heading outline-none";
  return (
    <header className="under-header relative isolate overflow-hidden bg-brand-deep text-white">
      <div className="hero-rise container-site flex flex-col items-center gap-3 py-7 text-center sm:py-9">
        {tabs ? (
          <nav aria-label="Sections" className="max-w-full overflow-x-auto [scrollbar-width:none]">
            <div className="inline-flex gap-0.5 rounded-full border border-white/15 bg-white/[0.06] p-1">
              {tabs.map(([href, text]) => (
                <Link key={href} href={href} aria-current={href === active ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ${href === active ? "bg-white font-semibold text-ink hover:text-ink" : "font-medium text-white/75 hover:bg-white/10 hover:text-white"}`}>{text}</Link>
              ))}
            </div>
          </nav>
        ) : null}
        <h1 className="max-w-3xl font-hero text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[40px] xl:text-[46px]">{title}</h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-[17px]">{intro}</p>
        {/* One inline search bar: words, category, sort and the button. Wraps to two rows on phones. */}
        <form role="search" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
          className="mt-1 grid w-full max-w-3xl grid-cols-2 gap-1 rounded-2xl bg-white p-1.5 text-left text-ink sm:flex sm:items-center sm:gap-0">
          <div className="relative col-span-2 min-w-0 sm:flex-1">
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={hint}
              aria-label={label}
              className="h-11 w-full rounded-xl bg-transparent pl-11 pr-10 text-[15px] text-heading outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden"
            />
            {q ? (
              <button type="button" onClick={() => onSearch("")} aria-label="Clear the search" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-page hover:text-heading">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {cats.length ? (
            <label className="relative rounded-xl bg-page sm:w-44 sm:rounded-none sm:border-l sm:border-line sm:bg-transparent">
              <span className="sr-only">Category</span>
              <LayoutGrid aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
              <select value={category} onChange={(e) => onCategory(e.target.value)} className={select}>
                <option value="">All categories</option>
                {cats.map(([id, c]) => <option key={id} value={id}>{c.name} ({c.n})</option>)}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            </label>
          ) : null}
          <label className={`relative rounded-xl bg-page sm:w-44 sm:rounded-none sm:border-l sm:border-line sm:bg-transparent ${cats.length ? "" : "col-span-2"}`}>
            <span className="sr-only">Sort by</span>
            <ArrowUpDown aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
            <select value={sort} onChange={(e) => onSort(e.target.value as T)} className={select}>
              {sorts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          </label>
          <button className="btn-primary col-span-2 h-11 shrink-0 rounded-xl px-6 text-[15px] font-semibold sm:ml-1">Search</button>
        </form>
        {popular.length ? (
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-[13px] text-white/60">
            Popular:
            {popular.map((e) => (
              <button key={e} type="button" onClick={() => { onSearch(e); onSubmit(); }}
                className="max-w-[14rem] truncate rounded-full border border-dotted border-white/40 bg-white/[0.05] px-2.5 py-0.5 capitalize text-white/80 transition hover:-translate-y-0.5 hover:border-accent hover:text-white">{e}</button>
            ))}
          </p>
        ) : null}
      </div>
    </header>
  );
}

/** "Browse by category" with every category and its count; `chosen` "" is All. */
export function CategoryChips({ cats, total, chosen, onChoose }: { cats: [string, { name: string; n: number }][]; total: number; chosen: string; onChoose: (id: string) => void }) {
  if (!cats.length) return null;
  return (
    <nav aria-label="Categories" className="flex flex-col">

      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none] sm:flex-wrap">
        <li className="shrink-0"><Chip on={!chosen} label="All" n={total} onClick={() => onChoose("")} /></li>
        {cats.map(([id, c]) => <li key={id} className="shrink-0"><Chip on={chosen === id} label={c.name} n={c.n} onClick={() => onChoose(id)} /></li>)}
      </ul>
    </nav>
  );
}

function Chip({ on, label, n, onClick }: { on: boolean; label: string; n: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${on ? "border-brand bg-brand text-white" : "border-dotted border-line-strong bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>
      {label}<span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/20" : "bg-page"}`}>{n}</span>
    </button>
  );
}

/** Categories present in the items, with their counts, most first. */
export function countCategories(items: { primaryCategory: { id: string; name: string } | null }[]) {
  const m = new Map<string, { name: string; n: number }>();
  for (const i of items) if (i.primaryCategory) m.set(i.primaryCategory.id, { name: i.primaryCategory.name, n: (m.get(i.primaryCategory.id)?.n ?? 0) + 1 });
  return [...m].sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name));
}

export function SortSelect<T extends string>({ value, options, onChange }: { value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      <span className="sr-only sm:not-sr-only">Sort by</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-11 rounded-lg border border-line bg-white px-3 pr-8 text-sm font-semibold text-heading hover:border-brand focus:border-brand focus:outline-none">
        {options.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </label>
  );
}

export function Pager({ current, pages, goTo }: { current: number; pages: number; goTo: (n: number) => void }) {
  if (pages < 2) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-1.5 pt-2">
      <PageButton disabled={current === 1} onClick={() => goTo(current - 1)} label="Previous page"><ChevronLeft className="h-4 w-4" /></PageButton>
      {Array.from({ length: pages }, (_, n) => n + 1).map((n) => (
        <button key={n} type="button" onClick={() => goTo(n)} aria-current={n === current ? "page" : undefined}
          className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-semibold ${n === current ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"}`}>{n}</button>
      ))}
      <PageButton disabled={current === pages} onClick={() => goTo(current + 1)} label="Next page"><ChevronRight className="h-4 w-4" /></PageButton>
    </nav>
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

/** Keeps the address bar in step with the search (no reload, no new history entries). */
export function syncAddress(path: string, state: { q: string; category: string; sort: string; defaultSort: string; page: number }) {
  const p = new URLSearchParams();
  if (state.q.trim()) p.set("q", state.q.trim());
  if (state.category) p.set("category", state.category);
  if (state.sort !== state.defaultSort) p.set("sort", state.sort);
  if (state.page > 1) p.set("page", String(state.page));
  const s = p.toString();
  window.history.replaceState(null, "", `${path}${s ? `?${s}` : ""}`);
}

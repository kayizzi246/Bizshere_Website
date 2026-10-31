"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

/**
 * Shared pieces of the in-page directory browsers (IdeaBrowser, ListingBrowser): the compact
 * SaaS-style hero with its glowing search box, category chips, sort menu and page numbers.
 */

export function BrowseHero({ crumb, badge, title, intro, tabs, active, q, onSearch, onSubmit, hint, label, popular }: {
  crumb: string;
  /** Number in the orange pill, then the text after it: [4, "machines listed"] */
  badge: [number, string];
  title: React.ReactNode;
  intro: string;
  /** Section tabs (e.g. Business machines | Suppliers), as [href, label] */
  tabs?: [string, string][];
  active?: string;
  q: string;
  onSearch: (v: string) => void;
  /** Enter or a "Popular" pick: scroll to the results */
  onSubmit: () => void;
  hint: string;
  label: string;
  popular: string[];
}) {
  return (
    <header className="relative isolate overflow-hidden bg-[#071A33] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_80%_at_50%_120%,#1E7FDB_0%,rgba(7,26,51,0)_70%)]" />
      <div aria-hidden className="drift pointer-events-none absolute -right-[15%] -top-[40%] -z-10 h-[110%] w-[55%] rounded-full bg-[radial-gradient(closest-side,rgba(34,199,207,0.22),transparent)]" />
      <div className="hero-rise container-site flex flex-col items-center gap-4 py-10 text-center sm:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-white/60">
          <Link href="/" className="text-white/60 hover:text-white">Home</Link> / <span className="text-white/90">{crumb}</span>
        </nav>
        {tabs ? (
          <nav aria-label="Sections" className="max-w-full overflow-x-auto [scrollbar-width:none]">
            <div className="inline-flex gap-0.5 rounded-full border border-white/15 bg-white/[0.06] p-1">
              {tabs.map(([href, text]) => (
                <Link key={href} href={href} aria-current={href === active ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ${href === active ? "bg-white font-semibold text-ink hover:text-ink" : "font-medium text-white/75 hover:bg-white/10 hover:text-white"}`}>{text}</Link>
              ))}
            </div>
          </nav>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] py-1 pl-1.5 pr-3 text-[13px] font-medium text-white/90 backdrop-blur">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-ink"><span aria-hidden className="live-dot h-1.5 w-1.5 rounded-full bg-ink" />{badge[0]}</span>
            {badge[1]}
          </span>
        )}
        <h1 className="max-w-3xl font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.035em] sm:text-[40px] xl:text-[46px]">{title}</h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-[17px]">{intro}</p>
        <form role="search" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="search-glow mt-1 w-full max-w-xl rounded-2xl">
          <div className="relative rounded-[14px] bg-white">
            <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={hint}
              aria-label={label}
              className="h-12 w-full rounded-[14px] border-0 bg-transparent pl-12 pr-11 text-[16px] text-heading outline-none placeholder:text-ink-muted sm:h-[52px] [&::-webkit-search-cancel-button]:hidden"
            />
            {q ? (
              <button type="button" onClick={() => onSearch("")} aria-label="Clear the search" className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-page hover:text-heading">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
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
    <nav aria-label="Categories" className="flex flex-col gap-3">
      <span className="text-xs font-bold uppercase tracking-widest text-ink-muted">Browse by category</span>
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

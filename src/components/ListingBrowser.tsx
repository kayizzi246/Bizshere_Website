"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useTypingHint } from "./TypingHint";
import { BrowseHero, CategoryChips, Pager, SortSelect, countCategories, syncAddress } from "./BrowseParts";

/** One listing as the browser needs it: plain values only (it runs in the visitor's browser). */
export type BrowseListing = {
  id: string; slug: string; href: string; title: string; summary: string | null;
  primaryCategory: { id: string; name: string } | null;
  /** One-line detail, e.g. machine type; for documents, the document type */
  extra: string | null;
  picture: string | null;
  reviewed: string;
  reviewedAt: number;
  /** Newest-first position */
  order: number;
  /** Everything the search looks in, lower case */
  text: string;
};

const PER_PAGE = 24;
const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "reviewed", label: "Recently checked" },
  { value: "az", label: "A to Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];
const name = (t: string) => t.replace(/^Sample:\s*/i, "");
const SORTERS: Record<Sort, (a: BrowseListing, b: BrowseListing) => number> = {
  newest: (a, b) => a.order - b.order,
  reviewed: (a, b) => b.reviewedAt - a.reviewedAt || a.order - b.order,
  az: (a, b) => name(a.title).localeCompare(name(b.title)),
};

/**
 * A directory page body (machines, suppliers, funding…), laid out like the business ideas page:
 * hero with the search box, category chips, sort and a paged grid, all filtering on the page.
 */
export function ListingBrowser({ items: all, path, icon, title, intro, unit, tabs, active, variant, photos, initial }: {
  items: BrowseListing[];
  path: string;
  icon: string;
  title: string;
  intro: string;
  unit: [string, string];
  tabs?: [string, string][];
  active?: string;
  variant: "cards" | "documents";
  /** Photo cards (machines, suppliers) instead of icon cards */
  photos: boolean;
  initial: { q: string; category: string; sort: string; page: number };
}) {
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [sort, setSort] = useState<Sort>(SORTS.some((s) => s.value === initial.sort) ? (initial.sort as Sort) : "newest");
  const [page, setPage] = useState(initial.page);
  const listTop = useRef<HTMLElement>(null);

  const cats = useMemo(() => countCategories(all), [all]);
  // Every word typed must appear somewhere in the listing.
  const items = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((i) => (!category || i.primaryCategory?.id === category) && words.every((w) => i.text.includes(w))).sort(SORTERS[sort]);
  }, [all, q, category, sort]);

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const current = Math.min(page, pages);
  const shown = items.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const chosenName = cats.find(([id]) => id === category)?.[1].name;
  const examples = useMemo(() => all.slice(0, 6).map((i) => name(i.title).toLowerCase()), [all]);
  const hint = useTypingHint(examples.length ? examples : [unit[1]], { prefix: `Search ${title.toLowerCase()}, e.g. `, paused: Boolean(q) });

  useEffect(() => syncAddress(path, { q, category, sort, defaultSort: "newest", page: current }), [path, q, category, sort, current]);

  const toList = () => listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goTo = (n: number) => { setPage(n); toList(); };
  const clear = () => { setQ(""); setCategory(""); setPage(1); };

  return (
    <>
      <BrowseHero
        crumb={title}
        badge={[all.length, `${all.length === 1 ? unit[0] : unit[1]} listed`]}
        title={title}
        intro={intro}
        tabs={tabs}
        active={active}
        q={q}
        onSearch={(v) => { setQ(v); setPage(1); }}
        onSubmit={toList}
        hint={hint}
        label={`Search ${title.toLowerCase()}`}
        popular={examples.slice(0, 4)}
      />

      <div className="bg-page">
        <div className="container-site flex flex-col gap-8 py-8 sm:py-10">
          <CategoryChips cats={cats} total={all.length} chosen={category} onChoose={(id) => { setCategory(id); setPage(1); }} />

          <section ref={listTop} aria-labelledby="listings" className="flex scroll-mt-4 flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 id="listings" className="text-section-title text-heading">
                  {q.trim() ? `Results for “${q.trim()}”${chosenName ? ` in ${chosenName}` : ""}` : chosenName ?? `All ${title.toLowerCase()}`}
                </h2>
                <p className="text-sm text-ink-muted" aria-live="polite">
                  <strong className="font-semibold text-ink-soft">{items.length} {items.length === 1 ? unit[0] : unit[1]}</strong>{pages > 1 ? ` · page ${current} of ${pages}` : ""}
                </p>
              </div>
              <SortSelect value={sort} options={SORTS} onChange={(v) => { setSort(v); setPage(1); }} />
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand"><Icon name={icon} className="h-5 w-5" /></span>
                <p className="text-sm font-semibold text-heading">{all.length ? "Nothing matches this search. Try other words or another category." : "Nothing published here yet."}</p>
                {all.length ? <button type="button" onClick={clear} className="text-[13px] font-semibold text-brand hover:text-brand-dark">Clear the search</button> : null}
              </div>
            ) : variant === "documents" ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {shown.map((i) => <li key={i.id} id={i.slug}><DocumentCard i={i} icon={icon} /></li>)}
              </ul>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((i) => <li key={i.id} id={i.slug} className="flex"><ListingCard i={i} icon={icon} photos={photos} /></li>)}
              </ul>
            )}

            <Pager current={current} pages={pages} goTo={goTo} />
          </section>
        </div>
      </div>
    </>
  );
}

/** Digital products: a file tile with its type, then the title. */
function DocumentCard({ i, icon }: { i: BrowseListing; icon: string }) {
  return (
    <Link href={i.href} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition-colors hover:border-brand hover:text-ink">
      <span className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-tint to-white">
        <span className="relative flex h-[72px] w-[58px] flex-col items-center justify-end rounded-lg border border-line bg-white pb-2 transition group-hover:-translate-y-1">
          <span aria-hidden className="absolute right-0 top-0 h-4 w-4 rounded-bl-md bg-brand-tint" />
          <Icon name={icon} className="absolute top-3 h-5 w-5 text-brand" strokeWidth={1.75} />
          <span aria-hidden className="h-1 w-7 rounded-full bg-accent" />
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
        <span className="w-fit max-w-full truncate rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-dark">{i.extra || "Document"}</span>
        <span className="line-clamp-2 font-display text-sm font-bold leading-tight tracking-tight text-heading group-hover:text-brand">{i.title}</span>
        <span className="mt-auto pt-1 text-[11px] text-ink-muted">{i.primaryCategory?.name ?? "General"}</span>
      </span>
    </Link>
  );
}

function ListingCard({ i, icon, photos }: { i: BrowseListing; icon: string; photos: boolean }) {
  return (
    <Link href={i.href} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-ink hover:shadow-[0_14px_30px_-14px_rgba(7,26,51,0.25)]">
      {photos ? (
        <span className="relative block overflow-hidden bg-page">
          {i.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- editor-entered address or /machines/… path
            <img src={i.picture} alt={i.title} loading="lazy" className="block aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <span className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-brand-tint to-white text-brand"><Icon name={icon} className="h-10 w-10" strokeWidth={1.5} /></span>
          )}
          {i.primaryCategory ? <span className="absolute left-3 top-3 max-w-[80%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-heading backdrop-blur">{i.primaryCategory.name}</span> : null}
        </span>
      ) : null}
      <span className="flex flex-1 flex-col gap-2 p-5">
        {!photos ? (
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
            <span className="truncate text-xs font-semibold text-accent-dark">{i.primaryCategory?.name ?? "General"}</span>
          </span>
        ) : null}
        <span className="font-display text-base font-bold leading-tight tracking-tight text-heading group-hover:text-brand">{i.title}</span>
        {i.summary ? <span className="line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{i.summary}</span> : null}
        {i.extra ? <span className="line-clamp-2 w-fit rounded-lg bg-page px-2.5 py-1.5 text-xs font-medium text-ink-soft">{i.extra}</span> : null}
        <span className="mt-auto flex items-center justify-between pt-3 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />Checked {i.reviewed}</span>
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-heading transition group-hover:border-brand group-hover:bg-brand group-hover:text-white">→</span>
        </span>
      </span>
    </Link>
  );
}

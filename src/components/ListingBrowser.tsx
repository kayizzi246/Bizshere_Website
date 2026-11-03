"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useTypingHint } from "./TypingHint";
import { BrowseHero, CategoryChips, Pager, SortSelect, countCategories, syncAddress } from "./BrowseParts";
import { RecentStrip, SeenBadge } from "./Recent";
import { WishlistHeart } from "./Wishlist";

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
  /** An outside address (useful websites): the table row goes straight there. */
  external?: string | null;
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
  /** "table": one row per listing (funding, useful websites) instead of cards. */
  variant: "cards" | "documents" | "table";
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
        cats={cats}
        category={category}
        onCategory={(id) => { setCategory(id); setPage(1); }}
        sort={sort}
        sorts={SORTS}
        onSort={(v) => { setSort(v); setPage(1); }}
      />

      <div className="bg-page">
        <div className="container-site flex flex-col gap-5 py-5 sm:gap-6 sm:py-6">
          <RecentStrip only={path} />
          <CategoryChips cats={cats} total={all.length} chosen={category} onChoose={(id) => { setCategory(id); setPage(1); }} />

          <section ref={listTop} aria-labelledby="listings" className="flex scroll-mt-4 flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                {/* A title only when it says something: the search or the chosen category */}
                <h2 id="listings" className={q.trim() || chosenName ? "text-block-title text-heading" : "sr-only"}>
                  {q.trim() ? `Results for “${q.trim()}”${chosenName ? ` in ${chosenName}` : ""}` : chosenName ?? title}
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
            ) : variant === "table" ? (
              <ListingTable rows={shown} />
            ) : variant === "documents" ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {shown.map((i) => <li key={i.id} id={i.slug} className="relative"><DocumentCard i={i} icon={icon} /><WishlistHeart id={i.id} className="absolute right-2 top-2" /></li>)}
              </ul>
            ) : (
              <ul className={`grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5 ${photos ? "grid-cols-2 gap-2.5" : "gap-3"}`}>
                {shown.map((i) => <li key={i.id} id={i.slug} className="relative flex"><ListingCard i={i} icon={icon} photos={photos} /><WishlistHeart id={i.id} className="absolute right-2 top-2 sm:right-3 sm:top-3" /></li>)}
              </ul>
            )}

            <Pager current={current} pages={pages} goTo={goTo} />
          </section>
        </div>
      </div>
    </>
  );
}

// Photo cards (machines) sit two a row on phones, so below sm they are compact: smaller padding,
// title and footer, and the summary and one-line detail are left out.
// Classes are written out in full so Tailwind finds them.
const compact = (photos: boolean, photoCard: string, iconCard: string) => (photos ? photoCard : iconCard);

/** Digital products: a file tile with its type, then the title. */
function DocumentCard({ i, icon }: { i: BrowseListing; icon: string }) {
  return (
    <Link href={i.href} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition-colors hover:border-brand hover:text-ink">
      <span className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-tint to-white">
        <SeenBadge href={i.href} className="absolute left-2 top-2" />
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
    <Link href={i.href} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition hover:-translate-y-0.5 hover:border-brand hover:text-ink">
      {photos ? (
        <span className="relative block overflow-hidden bg-page">
          {i.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- editor-entered address or /machines/… path
            <img src={i.picture} alt={i.title} loading="lazy" className="block aspect-[3/2] w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          ) : (
            <span className="flex aspect-[3/2] w-full items-center justify-center bg-gradient-to-br from-brand-tint to-white text-brand"><Icon name={icon} className="h-10 w-10" strokeWidth={1.5} /></span>
          )}
          {i.primaryCategory ? <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-heading backdrop-blur sm:left-3 sm:top-3 sm:max-w-[80%] sm:px-2.5 sm:py-1 sm:text-[11px]">{i.primaryCategory.name}</span> : null}
          <SeenBadge href={i.href} className="absolute bottom-2 right-2" />
        </span>
      ) : null}
      <span className={`flex flex-1 flex-col ${compact(photos, "gap-1 p-2.5 sm:gap-1.5 sm:p-3.5", "gap-2 p-4")}`}>
        {!photos ? (
          <span className="flex items-center gap-2.5 pr-9">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
            <span className="truncate text-xs font-semibold text-accent-dark">{i.primaryCategory?.name ?? "General"}</span>
            <SeenBadge href={i.href} className="ml-auto shrink-0 bg-brand-tint" />
          </span>
        ) : null}
        <span className={`font-display font-bold leading-tight tracking-tight text-heading group-hover:text-brand ${compact(photos, "line-clamp-2 text-[14px] sm:text-[15px]", "text-base")}`}>{i.title}</span>
        {i.summary ? <span className={`text-[13px] leading-snug text-ink-muted ${compact(photos, "hidden sm:line-clamp-1", "line-clamp-2")}`}>{i.summary}</span> : null}
        <span className={`mt-auto flex items-center justify-between text-ink-muted ${compact(photos, "pt-1 text-[11px] sm:pt-1.5 sm:text-xs", "pt-2 text-xs")}`}>
          <span className="inline-flex min-w-0 items-center gap-1.5"><span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /><span className="truncate">Checked {i.reviewed}</span></span>
          <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full border border-line text-heading transition group-hover:border-brand group-hover:bg-brand group-hover:text-white ${compact(photos, "h-7 w-7", "h-8 w-8")}`}>→</span>
        </span>
      </span>
    </Link>
  );
}

/**
 * Table view (funding, useful websites): name, detail, category and check date in columns, the
 * wishlist heart at the end. A row with an outside address opens that website directly.
 * Phones get the same rows stacked.
 */
function ListingTable({ rows }: { rows: BrowseListing[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <table className="w-full text-left text-[14px]">
        <thead className="hidden bg-brand-deep text-xs text-white/85 md:table-header-group">
          <tr>
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Details</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Checked</th>
            <th className="w-12 px-2 py-3"><span className="sr-only">Wishlist</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, n) => {
            const label = name(r.title);
            const link = r.external ? (
              <a href={r.external} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-heading hover:text-brand">{label}<span aria-hidden className="text-brand">↗</span></a>
            ) : (
              <Link href={r.href} className="font-semibold text-heading hover:text-brand">{label}</Link>
            );
            return (
              <tr key={r.id} id={r.slug} className={`flex flex-col gap-0.5 border-b border-line px-4 py-3 last:border-0 md:table-row md:p-0 ${n % 2 ? "bg-white" : "bg-brand-tint/40"}`}>
                <td className="md:px-4 md:py-3">
                  {link}
                  {r.summary ? <span className="mt-0.5 block text-[12px] leading-snug text-ink-muted md:hidden">{r.summary}</span> : null}
                  {r.external ? <span className="block truncate text-[12px] text-ink-muted">{r.external.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span> : null}
                </td>
                <td className="text-[13px] text-ink-soft md:px-4 md:py-3">{r.extra ?? <span className="hidden md:inline">—</span>}</td>
                <td className="text-[13px] text-ink-muted md:px-4 md:py-3">{r.primaryCategory?.name ?? "General"}</td>
                <td className="whitespace-nowrap text-[12px] text-ink-muted md:px-4 md:py-3">Checked {r.reviewed}</td>
                <td className="md:px-2 md:py-3"><WishlistHeart id={r.id} className="border border-line" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

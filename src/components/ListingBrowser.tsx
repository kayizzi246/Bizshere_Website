"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LockKeyhole, MapPin, Package } from "lucide-react";
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
  /** Where it comes from or who sells it (machines: their sources). `null` with `locked`: member detail. */
  source?: string | null;
  /** Price as text, e.g. "UGX 8M – 15M". */
  price?: string | null;
  /** Source and price are member detail and this viewer isn't a member: say so instead. */
  locked?: boolean;
  /** Supplier cards: country and what they sell, both public. */
  country?: string | null;
  sells?: string | null;
  /** A longer description for cards without a photo (tools), e.g. the overview. */
  description?: string | null;
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
  variant: "cards" | "documents" | "table" | "suppliers";
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
        popular={all.slice(0, 4).map((i) => name(i.title))}
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
            ) : variant === "suppliers" ? (
              <ul className="-mx-3 grid grid-cols-2 gap-2 sm:mx-0 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                {shown.map((i) => <li key={i.id} id={i.slug}><SupplierCard i={i} /></li>)}
              </ul>
            ) : variant === "table" ? (
              <ListingTable rows={shown} />
            ) : variant === "documents" ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {shown.map((i) => <li key={i.id} id={i.slug} className="relative"><DocumentCard i={i} icon={icon} /><WishlistHeart id={i.id} className="absolute right-2 top-2" /></li>)}
              </ul>
            ) : (
              <ul className={`grid sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5 ${photos ? "grid-cols-2 gap-2.5" : "gap-3"}`}>
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

/**
 * A directory card. The photo (or, without photos, a big icon) is clean: category and wishlist heart
 * sit in the text area, which reads top to bottom: name, source, price, then a highlighted
 * "View details" button. Source and price show only when the directory sends them (machines), and
 * as "Members only" for visitors: they are member detail.
 */
function ListingCard({ i, icon, photos }: { i: BrowseListing; icon: string; photos: boolean }) {
  const hasFacts = i.source !== undefined || i.price !== undefined || i.locked;
  return (
    <div className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition hover:-translate-y-0.5 hover:border-brand/60">
      {photos ? (
        <Link href={i.href} tabIndex={-1} aria-hidden className="relative block overflow-hidden bg-page">
          {i.picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- editor-entered address or /machines/… path
            <img src={i.picture} alt="" loading="lazy" className="block aspect-[3/2] w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
          ) : (
            <span className="flex aspect-[3/2] w-full items-center justify-center bg-gradient-to-br from-brand-tint to-white text-brand"><Icon name={icon} className="h-10 w-10" strokeWidth={1.5} /></span>
          )}
          <SeenBadge href={i.href} className="absolute bottom-2 right-2" />
        </Link>
      ) : null}
      <div className={`flex flex-1 flex-col ${compact(photos, "gap-1.5 p-3 sm:gap-2 sm:p-4", "gap-2.5 p-4 sm:p-5")}`}>
        {/* Category and wishlist, in the content area */}
        <div className="flex items-center justify-between gap-2">
          {photos ? (
            <span className="min-w-0 truncate rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-semibold text-brand-dark">{i.primaryCategory?.name ?? "General"}</span>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand"><Icon name={icon} className="h-7 w-7" strokeWidth={1.75} /></span>
          )}
          <span className="flex shrink-0 items-center gap-2">
            {!photos ? <SeenBadge href={i.href} className="bg-brand-tint" /> : null}
            <WishlistHeart id={i.id} className="border border-line" />
          </span>
        </div>
        {!photos ? <span className="text-xs font-semibold text-accent-dark">{i.primaryCategory?.name ?? "General"}</span> : null}

        <Link href={i.href} className={`font-display font-bold leading-tight tracking-tight text-heading hover:text-brand ${compact(photos, "line-clamp-2 text-[15px] sm:text-[16px]", "text-[17px]")}`}>{i.title}</Link>
        {photos
          ? (i.summary ? <p className="hidden text-[13px] leading-snug text-ink-muted sm:line-clamp-2">{i.summary}</p> : null)
          : (i.description || i.summary ? <p className="line-clamp-4 text-[13px] leading-relaxed text-ink-muted">{i.description || i.summary}</p> : null)}

        {hasFacts ? (
          <dl className="flex flex-col gap-1 rounded-xl bg-page px-3 py-2 text-[12px]">
            {i.locked ? (
              <div className="flex items-center gap-1.5 font-semibold text-accent-dark"><LockKeyhole aria-hidden className="h-3.5 w-3.5" />Source and price: members only</div>
            ) : (
              <>
                <div className="flex gap-2"><dt className="w-12 shrink-0 text-ink-muted">Source</dt><dd className="min-w-0 truncate font-medium text-ink-soft">{i.source || "Not added yet"}</dd></div>
                <div className="flex gap-2"><dt className="w-12 shrink-0 text-ink-muted">Price</dt><dd className="min-w-0 truncate font-bold text-heading">{i.price || "Being priced"}</dd></div>
              </>
            )}
          </dl>
        ) : null}

        <Link href={i.href} className="mt-auto inline-flex h-10 w-full items-center justify-center gap-1 rounded-full bg-brand px-3.5 text-[13px] font-bold text-white transition hover:bg-brand-dark hover:text-white">
          View details<span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </div>
  );
}

/** A supplier, the same card as a business idea (IdeaCard): a picture of what they sell, category, name, where they are, what they sell and a button. */
function SupplierCard({ i }: { i: BrowseListing }) {
  return (
    <div className="group relative flex h-full flex-col rounded-[20px] border border-line bg-white p-1.5 transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-[0_10px_28px_rgba(21,126,194,0.12)] sm:p-2">
      <div className="relative">
        <WishlistHeart id={i.id} className="absolute right-2 top-2 z-10" />
        <Link href={i.href} tabIndex={-1} aria-hidden className="relative block aspect-[4/3] overflow-hidden rounded-[14px] bg-brand-tint sm:aspect-[16/10]">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded or seller-entered address */}
          {i.picture ? <img src={i.picture} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" /> : (
            <span className="flex h-full w-full items-center justify-center text-brand/50"><Icon name="supplier" className="h-9 w-9" /></span>
          )}
          {i.primaryCategory ? <span className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-brand-dark sm:text-xs">{i.primaryCategory.name}</span> : null}
        </Link>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-1.5 pb-1.5 pt-3 sm:gap-2.5 sm:px-2 sm:pb-2">
        <Link href={i.href} className="font-display text-[15px] font-extrabold leading-tight tracking-[-0.01em] text-heading hover:text-brand sm:text-[16px]">{name(i.title)}</Link>
        {i.summary ? <p className="line-clamp-2 text-[12px] leading-snug text-ink-muted sm:text-[13px]">{i.summary}</p> : null}
        {i.country ? <p className="flex items-center gap-1 text-[12px] text-ink-soft sm:text-[13px]"><MapPin aria-hidden className="h-3.5 w-3.5 shrink-0 text-ink-muted" /><span className="truncate">{i.country}</span></p> : null}
        {i.sells ? (
          <p className="flex items-center gap-2 rounded-xl bg-page px-2.5 py-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-tint text-accent-dark"><Package aria-hidden className="h-3.5 w-3.5" /></span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-muted">What they sell</span>
              <strong className="line-clamp-2 text-[13px] font-bold text-heading">{i.sells}</strong>
            </span>
          </p>
        ) : null}
        <div className="mt-auto pt-1">
          <Link href={i.href} className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-full bg-brand px-3 text-[13px] font-bold text-white hover:bg-brand-dark hover:text-white sm:h-9">View products</Link>
        </div>
      </div>
    </div>
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
      <table className="w-full text-left text-[16px]">
        <thead className="hidden bg-brand-deep text-[14px] text-white md:table-header-group">
          <tr>
            <th className="px-4 py-3 font-bold">Name</th>
            <th className="px-4 py-3 font-bold">Details</th>
            <th className="px-4 py-3 font-bold">Category</th>
            <th className="px-4 py-3 font-bold">Checked</th>
            <th className="w-12 px-2 py-3"><span className="sr-only">Wishlist</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, n) => {
            const label = name(r.title);
            const link = r.external ? (
              <a href={r.external} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-heading hover:text-brand">{label}<span aria-hidden className="text-brand">↗</span></a>
            ) : (
              <Link href={r.href} className="font-bold text-heading hover:text-brand">{label}</Link>
            );
            return (
              <tr key={r.id} id={r.slug} className={`flex flex-col gap-0.5 border-b border-line px-4 py-3 last:border-0 md:table-row md:p-0 ${n % 2 ? "bg-white" : "bg-brand-tint/40"}`}>
                <td className="md:px-4 md:py-3">
                  {link}
                  {r.summary ? <span className="mt-0.5 block text-[14px] leading-snug text-ink-muted md:hidden">{r.summary}</span> : null}
                  {r.external ? <span className="block truncate text-[12px] text-ink-muted">{r.external.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span> : null}
                </td>
                <td className="text-[15px] text-ink-soft md:px-4 md:py-3">{r.extra ?? <span className="hidden md:inline">—</span>}</td>
                <td className="text-[15px] text-ink-muted md:px-4 md:py-3">{r.primaryCategory?.name ?? "General"}</td>
                <td className="whitespace-nowrap text-[14px] text-ink-muted md:px-4 md:py-3">Checked {r.reviewed}</td>
                <td className="md:px-2 md:py-3"><WishlistHeart id={r.id} className="border border-line" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

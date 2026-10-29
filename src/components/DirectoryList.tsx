import Link from "next/link";
import type { Category, ContentItem, ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, itemHref } from "@/lib/format";
import { DIRECTORIES } from "@/config/directories";
import { Icon } from "./Icon";
import { ServiceSearch } from "./ServiceSearch";
import { readSearch, searchListings, type SearchParams } from "@/lib/directory-search";

/** Directory landing page: published items of the given types, with optional section tabs and the service's own search. */
export async function DirectoryList({ path, searchParams, types, title, intro, tabs, active, meta, variant = "cards", images }: {
  /** This page's address; the search form submits back to it. */
  path: string;
  searchParams: SearchParams;
  types: ContentType[];
  title: string;
  intro: string;
  tabs?: [string, string][];
  active?: string;
  /** Optional one-line detail per card, e.g. yield or deadline. Keyed by content item id. Public fields only. */
  meta?: (ids: string[]) => Promise<Record<string, string>>;
  /** "documents" shows the items as digital products (file tile per item); `meta` is used as the document type. */
  variant?: "cards" | "documents";
  /** Photo per card (keyed by content item id). Turns the cards into photo cards. */
  images?: (ids: string[]) => Promise<Record<string, string>>;
}) {
  const search = await readSearch(types[0], searchParams);
  const items: (ContentItem & { primaryCategory: Category | null })[] = search.active
    ? await searchListings(types[0], search.q, search.values)
    : await prisma.contentItem.findMany({
        where: { contentType: { in: types }, publicationStatus: "PUBLISHED" },
        include: { primaryCategory: true },
        orderBy: [{ publishedAt: "desc" }],
        take: 60,
      });
  const extra = meta ? await meta(items.map((i) => i.id)) : {};
  const pictures = images ? await images(items.map((i) => i.id)) : null;
  const icon = DIRECTORIES.find((d) => d.type === types[0])?.icon ?? (types[0] === "INVESTMENT_OPPORTUNITY" ? "funding" : "link");
  const empty = search.active ? "Nothing matches this search. Try fewer filters." : "Nothing published here yet.";

  return (
    <>
      <ListingHeader icon={icon} title={title} intro={intro} tabs={tabs} active={active} count={items.length} searching={search.active}>
        <ServiceSearch path={path} label={title} q={search.q} filters={search.filters} values={search.values} count={items.length} />
      </ListingHeader>
      <div className="bg-page">
        <div className="container-site flex flex-col gap-6 py-8 sm:py-10">

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-white px-6 py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand"><Icon name={icon} className="h-5 w-5" /></span>
              <p className="text-sm font-semibold text-heading">{empty}</p>
              {search.active ? <Link href={path} className="text-[13px] font-semibold">Clear the search</Link> : null}
            </div>
          ) : variant === "documents" ? (
            // Digital products: a file tile with its type, then the title.
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((i) => (
                <Link id={i.slug} key={i.id} href={itemHref(i)} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition-colors hover:border-brand hover:text-ink">
                  <span className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-brand-tint to-white">
                    <span className="relative flex h-[72px] w-[58px] flex-col items-center justify-end rounded-lg border border-line bg-white pb-2 transition group-hover:-translate-y-1">
                      <span aria-hidden className="absolute right-0 top-0 h-4 w-4 rounded-bl-md bg-brand-tint" />
                      <Icon name={icon} className="absolute top-3 h-5 w-5 text-brand" strokeWidth={1.75} />
                      <span aria-hidden className="h-1 w-7 rounded-full bg-accent" />
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col gap-1.5 p-3.5 sm:p-4">
                    <span className="w-fit max-w-full truncate rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-dark">{extra[i.id] || "Document"}</span>
                    <span className="line-clamp-2 font-sans text-sm font-black leading-tight tracking-tight text-heading group-hover:text-brand">{i.title}</span>
                    <span className="mt-auto pt-1 text-[11px] text-ink-muted">{i.primaryCategory?.name ?? "General"}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((i) => (
                <Link id={i.slug} key={i.id} href={itemHref(i)} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink transition-colors hover:border-brand hover:text-ink">
                  {pictures ? (
                    <span className="relative block overflow-hidden bg-page">
                      {pictures[i.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- editor-entered address or /machines/… path
                        <img src={pictures[i.id]} alt={i.title} loading="lazy" className="block aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                      ) : (
                        <span className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-brand-tint to-white text-brand"><Icon name={icon} className="h-10 w-10" strokeWidth={1.5} /></span>
                      )}
                      {i.primaryCategory ? <span className="absolute left-3 top-3 max-w-[80%] truncate rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-heading backdrop-blur">{i.primaryCategory.name}</span> : null}
                    </span>
                  ) : null}
                  <span className="flex flex-1 flex-col gap-2 p-5">
                    {!pictures ? (
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand"><Icon name={icon} className="h-[18px] w-[18px]" /></span>
                        <span className="truncate text-xs font-semibold text-accent-dark">{i.primaryCategory?.name ?? "General"}</span>
                      </span>
                    ) : null}
                    <span className="font-sans text-[17px] font-black leading-tight tracking-tight text-heading group-hover:text-brand">{i.title}</span>
                    {i.shortSummary ? <span className="line-clamp-2 text-[13px] leading-relaxed text-ink-muted">{i.shortSummary}</span> : null}
                    {extra[i.id] ? <span className="line-clamp-2 w-fit rounded-lg bg-page px-2.5 py-1.5 text-xs font-medium text-ink-soft">{extra[i.id]}</span> : null}
                    <span className="mt-auto flex items-center justify-between pt-3 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />Reviewed {date(i.lastReviewedAt)}</span>
                      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-heading transition group-hover:border-brand group-hover:bg-brand group-hover:text-white">→</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Page header for a directory: a deep navy band (like the homepage hero and the Experts page)
 * with section tabs, the number of listings, title, intro and, as `children`, the search.
 */
export function ListingHeader({ icon, title, intro, tabs, active, count, searching = false, unit, children }: {
  icon: string;
  title: string;
  intro: string;
  tabs?: [string, string][];
  active?: string;
  count: number;
  searching?: boolean;
  unit?: [string, string];
  /** The directory's search form, shown in the band. */
  children?: React.ReactNode;
}) {
  const [one, many] = unit ?? ["listing", "listings"];
  return (
    <header className="bg-[#071A33] text-white">
      <div className="container-site flex flex-col gap-6 py-9 sm:py-12">
        {tabs ? (
          <nav aria-label="Sections" className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none]">
            <div className="inline-flex gap-0.5 rounded-full border border-white/15 bg-white/[0.06] p-1">
              {tabs.map(([href, label]) => (
                <Link key={href} href={href} aria-current={href === active ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ${href === active ? "bg-white font-semibold text-ink hover:text-ink" : "font-medium text-white/75 hover:bg-white/10 hover:text-white"}`}>{label}</Link>
              ))}
            </div>
          </nav>
        ) : null}
        <div className="flex max-w-3xl flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] py-1 pl-1.5 pr-3 text-xs font-semibold text-white/90">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink"><Icon name={icon} className="h-3 w-3" /></span>
            {count} {count === 1 ? one : many}{searching ? " found" : ""}
          </span>
          <h1 className="font-sans text-[32px] font-black leading-[1.08] tracking-[-0.02em] sm:text-[46px]">{title}</h1>
          <p className="text-base leading-relaxed text-white/75 sm:text-lg">{intro}</p>
        </div>
        {children ? <div className="max-w-4xl">{children}</div> : null}
      </div>
    </header>
  );
}

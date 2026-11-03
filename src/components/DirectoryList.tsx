import Link from "next/link";
import type { ContentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { date, itemHref } from "@/lib/format";
import { DIRECTORIES } from "@/config/directories";
import { ListingBrowser, type BrowseListing } from "./ListingBrowser";
import type { SearchParams } from "@/lib/directory-search";

/**
 * Directory landing page: published items of the given types, laid out like the business ideas page
 * (ListingBrowser): hero with the search box, category chips, sort and a paged grid. Searching and
 * filtering happen on the page itself, so visitors never leave it.
 */
export async function DirectoryList({ path, searchParams, types, title, intro, tabs, active, meta, variant = "cards", images, links }: {
  /** This page's address; the address bar keeps the search here. */
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
  variant?: "cards" | "documents" | "table";
  /** Photo per card (keyed by content item id). Turns the cards into photo cards. */
  images?: (ids: string[]) => Promise<Record<string, string>>;
  /** Outside address per item (useful websites): table rows link straight to it. */
  links?: (ids: string[]) => Promise<Record<string, string>>;
}) {
  const rows = await prisma.contentItem.findMany({
    where: { contentType: { in: types }, publicationStatus: "PUBLISHED" },
    include: { primaryCategory: { select: { id: true, name: true } } },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }],
    take: 500,
  });
  const extra = meta ? await meta(rows.map((i) => i.id)) : {};
  const pictures = images ? await images(rows.map((i) => i.id)) : null;
  const outside = links ? await links(rows.map((i) => i.id)) : {};
  const dir = DIRECTORIES.find((d) => d.type === types[0]);
  const icon = dir?.icon ?? (types[0] === "INVESTMENT_OPPORTUNITY" ? "funding" : "link");
  const items: BrowseListing[] = rows.map((i, order) => ({
    id: i.id, slug: i.slug, href: itemHref(i), title: i.title, summary: i.shortSummary,
    primaryCategory: i.primaryCategory,
    extra: extra[i.id] || null,
    picture: pictures?.[i.id] ?? null,
    external: outside[i.id] ?? null,
    reviewed: date(i.lastReviewedAt),
    reviewedAt: i.lastReviewedAt?.getTime() ?? 0,
    order,
    text: [i.title, i.shortSummary, i.primaryCategory?.name, extra[i.id]].filter(Boolean).join(" ").toLowerCase(),
  }));
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  return (
    <ListingBrowser
      items={items} path={path} icon={icon} title={title} intro={intro} unit={dir?.unit ?? ["listing", "listings"]}
      tabs={tabs} active={active} variant={variant} photos={Boolean(pictures)}
      initial={{ q: first(searchParams.q), category: first(searchParams.category), sort: first(searchParams.sort), page: Math.max(1, Number.parseInt(first(searchParams.page), 10) || 1) }}
    />
  );
}

/**
 * Page header for a directory: a deep deep brand blue band (like the homepage hero and the Experts page)
 * with section tabs, title, intro and, as `children`, the search.
 */
export function ListingHeader({ title, intro, tabs, active, overlap = false }: {
  title: string;
  intro: string;
  tabs?: [string, string][];
  active?: string;
  /** Leave room at the bottom for a <StickySearch> that overlaps the band. */
  overlap?: boolean;
}) {
  return (
    <header className="under-header bg-brand-deep text-white">
      <div className={`container-site flex flex-col gap-6 pt-9 sm:pt-12 ${overlap ? "pb-20 sm:pb-24" : "pb-9 sm:pb-12"}`}>
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
          <h1 className="text-page-title">{title}</h1>
          <p className="text-[15px] leading-relaxed text-white/75 sm:text-base">{intro}</p>
        </div>
      </div>
    </header>
  );
}

/**
 * Holds a directory's search card: it overlaps the bottom of the deep brand blue header band, then stays
 * pinned to the top of the screen while the results scroll (desktop and phones); on these pages the
 * site header scrolls away instead (globals.css). It sits inside the
 * results area, not the band, because a sticky element only sticks within its parent.
 */
export function StickySearch({ children }: { children: React.ReactNode }) {
  return (
    <div data-sticky-search="" className="sticky top-2 z-30 -mt-14 sm:-mt-16">
      <div className="container-site">{children}</div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTypingHint } from "./TypingHint";
import { BrowseHero, countCategories, syncAddress } from "./BrowseParts";
import { RecentStrip } from "./Recent";
import { BoardAside, BoardEmpty, DirectoryBoard, ListingRow, ListingTile, gridList } from "./DirectoryBoard";

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
  /** An outside address (useful websites): the card goes straight there. */
  external?: string | null;
  /** Funding and investment: details the row card reads by label (By, Type, Where…). `null` value with `locked`: member detail, never sent. */
  cells?: { label: string; value: string | null; locked?: boolean }[];
  /** Funding: where to apply, on the provider's own website. Member detail: `null` with `applyLocked`. */
  apply?: string | null;
  /** This viewer isn't a member: Apply opens the join and payment pop-up instead. */
  applyLocked?: boolean;
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

/** How many listings show before "Load more" (client, 17 Nov 2026). Each press adds another ten. */
const PER_PAGE = 10;
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

// Each directory's list title (before a search or category is picked) and side-column wording
const BOARD: Record<string, { heading: string; note?: string; members?: { title: string; text: string }; help?: { title: string; text: string } }> = {
  "/funding": {
    heading: "Loans, grants and investors",
    members: { title: "See every funding range", text: "Members see how much each fund gives and apply straight on the provider's own page." },
    help: { title: "Need help applying?", text: "A business expert can help you pick the right fund and get your papers ready." },
  },
  "/opportunities": {
    heading: "Projects seeking investors",
    note: "Return figures are the promoter's claims, not established outcomes.",
    help: { title: "Thinking of investing?", text: "A business expert can help you check a project before you put money in." },
  },
  "/machines": {
    heading: "Machines for your business",
    members: { title: "See sources and prices", text: "Members see where to buy each machine and what it costs." },
    help: { title: "Not sure which machine?", text: "A business expert can help you choose the right machine for your plan." },
  },
  "/suppliers": { heading: "Suppliers for your stock and materials", help: { title: "Need a supplier you can trust?", text: "A business expert can help you compare suppliers and terms." } },
  "/guides": { heading: "Step-by-step business guides" },
  "/tools": { heading: "Calculators and templates" },
  "/websites": { heading: "Websites you will need" },
  "/news": { heading: "Latest business news" },
};

/**
 * A directory page body (machines, suppliers, funding, guides…): a short hero with the search box, then the
 * job-board style list (DirectoryBoard; client, 13 Nov 2026): pinned pill tabs and sort, one row card per listing,
 * a side column. Searching, filtering and sorting happen on the page.
 */
export function ListingBrowser({ items: all, path, icon, title, intro, unit, tabs, active, variant, initial }: {
  items: BrowseListing[];
  path: string;
  icon: string;
  title: string;
  intro: string;
  unit: [string, string];
  tabs?: [string, string][];
  active?: string;
  /** How a row reads: "suppliers" (Products button), "documents" (Open), others View; websites go straight out. */
  variant: "cards" | "documents" | "table" | "suppliers" | "funding";
  /** No longer changes the layout; kept so callers needn't change. */
  photos?: boolean;
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
  // Everything up to the current page, so Load more adds to the list instead of replacing it. The
  // page number still rides in the address, so a reload or a shared link reopens the same amount.
  const shown = items.slice(0, current * PER_PAGE);
  const remaining = items.length - shown.length;
  const chosenName = cats.find(([id]) => id === category)?.[1].name;
  const examples = useMemo(() => all.slice(0, 6).map((i) => name(i.title).toLowerCase()), [all]);
  const hint = useTypingHint(examples.length ? examples : [unit[1]], { prefix: `Search ${title.toLowerCase()}, e.g. `, paused: Boolean(q) });

  useEffect(() => syncAddress(path, { q, category, sort, defaultSort: "newest", page: current }), [path, q, category, sort, current]);

  const toList = () => listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const goTo = (n: number) => { setPage(n); toList(); };
  const clear = () => { setQ(""); setCategory(""); setPage(1); };
  const pick = (id: string) => { setCategory(id); setPage(1); };
  const order = (v: Sort) => { setSort(v); setPage(1); };

  const board = BOARD[path] ?? { heading: title };
  const heading = q.trim() ? `Results for “${q.trim()}”${chosenName ? ` in ${chosenName}` : ""}` : chosenName ? `${chosenName} ${unit[1]}` : board.heading;
  const locked = all.some((i) => i.applyLocked || i.locked || i.cells?.some((c) => c.locked));
  // Machines as a photo grid, four a row (client, 13 Nov 2026); suppliers and the rest keep the row cards.
  const grid = path === "/machines";

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
        popular={[]}
        cats={cats}
        category={category}
        onCategory={pick}
        sort={sort}
        sorts={SORTS}
        onSort={order}
        compact
      />
      <DirectoryBoard crumb={title} heading={heading} count={items.length} note={board.note}
        cats={cats} category={category} onCategory={pick} sort={sort} sorts={SORTS} onSort={order}
        top={<RecentStrip only={path} />}
        aside={<BoardAside path={path} tabs={tabs} active={active} locked={locked} members={board.members} help={board.help} />}
        pager={remaining > 0 ? (
          <LoadMore remaining={remaining} step={PER_PAGE} unit={unit} onMore={() => setPage(current + 1)} />
        ) : null}
        listTop={listTop}>
        {items.length === 0 ? <BoardEmpty any={all.length > 0} onClear={clear} /> : grid ? (
          <ul className={gridList}>
            {shown.map((i) => <li key={i.id} id={i.slug}><ListingTile i={i} icon={icon} variant={variant} /></li>)}
          </ul>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {shown.map((i) => <li key={i.id} id={i.slug}><ListingRow i={i} icon={icon} variant={variant} /></li>)}
          </ul>
        )}
      </DirectoryBoard>
    </>
  );
}

/**
 * "Load more": the whole list stays on one page and grows ten at a time.
 *
 * It says how many are left rather than only "Load more", so the size of what is still below is
 * known before pressing. A plain button, not an infinite scroll: these pages are read with a
 * purpose, and a list that keeps growing by itself makes the footer impossible to reach.
 */
function LoadMore({ remaining, step, unit, onMore }: { remaining: number; step: number; unit: readonly [string, string] | string[]; onMore: () => void }) {
  const next = Math.min(step, remaining);
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <button type="button" onClick={onMore}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-surface px-6 font-display text-[14px] font-bold text-heading transition-colors hover:bg-page">
        Show {next} more
      </button>
      <span className="text-[12.5px] text-ink-muted">{remaining} more {remaining === 1 ? unit[0] : unit[1]} to see</span>
    </div>
  );
}
